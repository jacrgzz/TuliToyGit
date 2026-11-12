'use client';
/* eslint-disable react-hooks/immutability -- escena de three.js imperativa: cada cuadro muta huesos,
   párpados, vectores de trabajo y el cursor fuera de React (useFrame y eventos, nunca en el render). */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { playBoing, playPop, playSqueak } from './sound';
import { ositoView } from './view';

// Osito de Angel Cervantes: oso sin ojos con esqueleto (pesos pasados de un modelo anterior) + ojo
// aparte. Ambos de Tripo, por FBX2glTF + weld/simplify/webp.
const MODEL_URL = '/models/landing/osito-v2.glb';
const EYE_URL = '/models/landing/ojo.glb';
// alto del osito en unidades de escena tras normalizar
const BEAR_HEIGHT = 3;

const DEG = Math.PI / 180;
// pose base del saludo, en grados
const ARM_UP = 50;
const PALM_FRONT = 60;

// la cámara mira al pecho: cabeza bajo el título y el osito cortado a media panza
const FOCUS_Y = 2.38;
// distancia de cámara en escritorio: más baja = osito más grande
const CAM_DIST = 5.2;
// ancho de escena que debe caber (brazos abiertos) en pantallas angostas
const MIN_VISIBLE_WIDTH = 3.4;
// encuadre al hacer scroll: el osito completo (pies incluidos) con aire arriba y abajo
const FULL_FOCUS_Y = BEAR_HEIGHT * 0.5;
const FULL_VISIBLE_HEIGHT = BEAR_HEIGHT * 1.35;

const _q = new THREE.Quaternion();
const _v1 = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _shoulder = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _qD = new THREE.Quaternion();
const _qP = new THREE.Quaternion();
const _qA = new THREE.Quaternion();
const _plane = new THREE.Plane();
const _zAxis = new THREE.Vector3(0, 0, 1);
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

// agarrar las patitas
const HANDS = [-1, 1] as const;
const HAND_HIT_R = 0.38; // radio de la agarradera (mundo)
const MAX_PULL = 1.1; // cuánto se puede jalar la mano (mundo)
const SPRING_K = 170; // rigidez del resorte al soltar
const SPRING_C = 6.5; // amortiguación: baja = más rebotes
const HAND_MARGIN = 0.22; // grosor de la patita: distancia mínima al contorno del cuerpo
/** Zonas que la mano no puede invadir: [cx, cy, rx, ry] en mundo (cabeza sigue al hueso). */
function BODY_ZONES(rig: Rig, tmp: THREE.Vector3): [number, number, number, number][] {
  const zones: [number, number, number, number][] = [[0, 1.0, 0.8, 1.15]]; // torso
  if (rig.head) {
    rig.head.getWorldPosition(tmp);
    zones.push([tmp.x, tmp.y + 0.6, 0.9, 0.8]); // cabeza (el hueso está en la base)
  }
  return zones;
}
const _target = new THREE.Vector3();
const _eyePos = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _m4 = new THREE.Matrix4();
const _qWorld = new THREE.Quaternion();
const _qParent = new THREE.Quaternion();
const _e = new THREE.Euler();

type Rig = {
  head?: THREE.Bone;
  neck?: THREE.Bone;
  spine?: THREE.Bone;
  lArm?: THREE.Bone;
  rArm?: THREE.Bone;
  lFore?: THREE.Bone;
  rFore?: THREE.Bone;
  lHand?: THREE.Bone;
  rHand?: THREE.Bone;
  rest: Map<THREE.Bone, THREE.Quaternion>;
  /** giro de mundo de cada hueso en reposo: para girar en ejes de pantalla (poseWorld) */
  restWorld: Map<THREE.Bone, THREE.Quaternion>;
};

// GLTFLoader quita los ":" ("mixamorig:Head" -> "mixamorigHead"); se compara sin prefijo
function findRig(root: THREE.Object3D): Rig {
  const rest = new Map<THREE.Bone, THREE.Quaternion>();
  const restWorld = new Map<THREE.Bone, THREE.Quaternion>();
  const bones: Record<string, THREE.Bone> = {};
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) {
      bones[o.name.replace(/^mixamorig:?/, '')] = o as THREE.Bone;
      rest.set(o as THREE.Bone, o.quaternion.clone());
      restWorld.set(o as THREE.Bone, o.getWorldQuaternion(new THREE.Quaternion()));
    }
  });
  return {
    head: bones.Head,
    neck: bones.Neck,
    spine: bones.Spine2 ?? bones.Spine1,
    lArm: bones.LeftArm,
    rArm: bones.RightArm,
    lFore: bones.LeftForeArm,
    rFore: bones.RightForeArm,
    lHand: bones.LeftHand,
    rHand: bones.RightHand,
    rest,
    restWorld,
  };
}

/** Pose = rest * rotación local extra (radianes, orden XYZ). */
function pose(rig: Rig, bone: THREE.Bone | undefined, x: number, y: number, z: number) {
  if (!bone) return;
  const r = rig.rest.get(bone);
  if (!r) return;
  _q.setFromEuler(_e.set(x, y, z));
  bone.quaternion.copy(r).multiply(_q);
}

/** Material original del modelo pasado a Standard mate (peluche sin brillo plástico). */
function makeToyMaterial(src: THREE.MeshStandardMaterial) {
  const mat = new THREE.MeshStandardMaterial({
    map: src.map ?? null,
    normalMap: src.normalMap ?? null,
    roughness: 0.92,
    metalness: 0,
  });
  if (mat.map) {
    mat.map.colorSpace = THREE.SRGBColorSpace;
    mat.map.anisotropy = 8;
  }
  return mat;
}

// Globos oculares medidos sobre el modelo (ajuste de esfera a los vértices del ojo), en mundo con el
// osito en reposo.
const EYE = { x: 0.325, y: 2.155, z: 0.58, r: 0.22 };
// bordes de los párpados en radios del párpado: abiertos fuera del ojo, cerrados se juntan bajo el centro
const LID_OPEN = 1.02; // superior
const LID_LOW_OPEN = -1.02; // inferior
const LID_MEET = -0.3;

/**
 * Párpados = media esfera frontal un poco más grande que el ojo. El shader descarta la franja entre
 * uLow y uCut (el ojo abierto): al bajar uCut cae el párpado superior y al subir uLow sube el inferior.
 * El superior lleva línea de pestaña.
 */
function makeLidMaterial(cut: { value: number }, low: { value: number }) {
  const mat = new THREE.MeshStandardMaterial({ color: '#df7633', roughness: 0.92, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCut = cut;
    shader.uniforms.uLow = low;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLid;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLid = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLid;\nuniform float uCut;\nuniform float uLow;')
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        // hueco del ojo entre el párpado inferior (uLow) y el superior (uCut)
        if (vLid.y < uCut && vLid.y > uLow) discard;
        // pestaña: banda oscura en el borde del párpado superior; el inferior lleva una sombra suave
        float lash = vLid.y >= uCut ? 1.0 - smoothstep(0.0, 0.12, vLid.y - uCut) : 0.0;
        float lowEdge = vLid.y <= uLow ? (1.0 - smoothstep(0.0, 0.08, uLow - vLid.y)) * 0.35 : 0.0;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.07, 0.14), max(lash * 0.9, lowEdge));`
      );
  };
  return mat;
}


const _qw = new THREE.Quaternion();
const _qi = new THREE.Quaternion();
/** Pose con la rotación extra en ejes del mundo (x = cabeceo, y = giro, z = ladeo), sin importar
 *  cómo vengan orientados los ejes locales del hueso: rest * (Rw⁻¹ · D · Rw). */
function poseWorld(rig: Rig, bone: THREE.Bone | undefined, x: number, y: number, z: number) {
  if (!bone) return;
  const r = rig.rest.get(bone);
  const rw = rig.restWorld.get(bone);
  if (!r || !rw) return;
  _qw.setFromEuler(_e.set(x, y, z));
  _qi.copy(rw).invert().multiply(_qw).multiply(rw);
  bone.quaternion.copy(r).multiply(_qi);
}

function Bear({ onReady }: { onReady?: () => void }) {
  const gltf = useGLTF(MODEL_URL);
  const eyeGltf = useGLTF(EYE_URL);
  const group = useRef<THREE.Group>(null);
  const joyRef = useRef(0); // 0..1 se activa con clic/caricias y se apaga solo
  const squash = useRef(0); // rebote al clic
  const stretch = useRef(0); // cuánto se está estirando un brazo (0..0.7)
  const look = useRef(new THREE.Vector2());
  const announced = useRef(false); // ya avisó que está listo (primer cuadro dibujado)
  // cursor en toda la ventana (el menú y el título tapan el canvas y R3F no recibe esos eventos),
  // normalizado a -1..1 respecto al canvas
  const gl = useThree((st) => st.gl);
  const pointerRef = useRef(new THREE.Vector2());
  useEffect(() => {
    const pointer = pointerRef.current;
    const onMove = (e: PointerEvent) => {
      const r = gl.domElement.getBoundingClientRect();
      pointer.set(
        THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1.2, 1.2),
        THREE.MathUtils.clamp(-(((e.clientY - r.top) / r.height) * 2 - 1), -1.2, 1.2)
      );
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [gl]);

  // clon propio con SkeletonUtils: Object3D.clone() dejaría la malla atada a los huesos del original
  const { model, rig } = useMemo(() => {
    const model = cloneSkinned(gltf.scene);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const s = BEAR_HEIGHT / size.y;
    model.scale.multiplyScalar(s);
    model.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(model);
    const c = b2.getCenter(new THREE.Vector3());
    model.position.x -= c.x;
    model.position.z -= c.z;
    model.position.y -= b2.min.y;

    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.raycast = () => {}; // el raycast contra malla skinned recalcula cada vértice en cada movimiento del cursor
      m.frustumCulled = false; // skinned: la caja de reposo no cubre los brazos alzados
      m.material = makeToyMaterial(m.material as THREE.MeshStandardMaterial);
    });
    const rig = findRig(model);
    return { model, rig };
  }, [gltf]);

  // ---------- parpadeo: párpados del color del pelo pegados al hueso de la cabeza ----------
  const lids = useRef<THREE.Mesh[]>([]);
  const nextBlink = useRef(1.5);
  const blinkT = useRef(-1);

  // ojos y párpados pegados al hueso de la cabeza (heredan su giro). Se orientan con los ejes del
  // mundo en reposo para que "arriba" sea arriba de la cara.
  const eyes = useRef<THREE.Object3D[]>([]);
  // uniforms de los párpados: el shader los lee y useFrame los cambia cada cuadro
  const lidCutRef = useRef({ value: LID_OPEN });
  const lidLowRef = useRef({ value: LID_LOW_OPEN });
  useEffect(() => {
    const head = rig.head;
    if (!head) return;
    model.updateMatrixWorld(true);
    const { x: ex, y: ey, z: ez, r: er } = EYE;
    const mat = makeLidMaterial(lidCutRef.current, lidLowRef.current);
    // media esfera frontal (phi 0..π => z >= 0)
    const geo = new THREE.SphereGeometry(1, 32, 20, 0, Math.PI);
    const hs = head.getWorldScale(new THREE.Vector3()).x;
    const headQ = head.getWorldQuaternion(new THREE.Quaternion()).invert();
    const made = [-1, 1].map((side) => {
      const lid = new THREE.Mesh(geo, mat);
      lid.position.copy(head.worldToLocal(new THREE.Vector3(side * ex, ey, ez)));
      lid.quaternion.copy(headQ);
      lid.scale.setScalar((er * 1.07) / hs);
      lid.raycast = () => {};
      lid.frustumCulled = false;
      head.add(lid);
      return lid;
    });
    lids.current = made;

    // ojos: pivote en el centro del globo (gira hacia el cursor) + modelo centrado y escalado al globo
    const box = new THREE.Box3().setFromObject(eyeGltf.scene);
    const eyeCenter = box.getCenter(new THREE.Vector3());
    const eyeSize = box.getSize(new THREE.Vector3());
    const pivots = [-1, 1].map((side) => {
      const pivot = new THREE.Object3D();
      pivot.position.copy(head.worldToLocal(new THREE.Vector3(side * ex, ey, ez)));
      pivot.quaternion.copy(headQ);
      pivot.scale.setScalar(1 / hs);
      pivot.userData.rest = pivot.quaternion.clone();
      const inner = eyeGltf.scene.clone(true);
      inner.position.copy(eyeCenter).multiplyScalar(-1);
      const holder = new THREE.Group();
      holder.add(inner);
      holder.scale.setScalar((er * 2) / Math.max(eyeSize.x, eyeSize.y));
      inner.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.raycast = () => {};
        const src = m.material as THREE.MeshStandardMaterial;
        if (src.map) src.map.colorSpace = THREE.SRGBColorSpace;
        // brillo húmedo del ojo
        m.material = new THREE.MeshStandardMaterial({ map: src.map ?? null, roughness: 0.18, metalness: 0 });
      });
      pivot.add(holder);
      head.add(pivot);
      return pivot;
    });
    eyes.current = pivots;

    return () => {
      made.forEach((l) => head.remove(l));
      pivots.forEach((p) => head.remove(p));
      geo.dispose();
      mat.dispose();
    };
  }, [model, rig, eyeGltf]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    const pointer = pointerRef.current;
    if (!announced.current) {
      // primer cuadro con el modelo: la pantalla de carga ya puede abrirse
      announced.current = true;
      onReady?.();
    }

    // la mirada sigue al cursor con resorte suave
    look.current.x += (pointer.x - look.current.x) * Math.min(1, delta * 4);
    look.current.y += (pointer.y - look.current.y) * Math.min(1, delta * 4);
    const lx = look.current.x;
    const ly = look.current.y;

    const breathe = Math.sin(t * 2.2) * 0.5 + 0.5;
    squash.current = Math.max(0, squash.current - delta * 2.5);
    joyRef.current = Math.max(0, joyRef.current - delta * 0.6);
    const k = squash.current;
    const joy = joyRef.current;
    const bounce = Math.sin(k * Math.PI * 3) * k;
    g.scale.set(1 + bounce * 0.08, 1 - bounce * 0.1 + breathe * 0.01, 1 + bounce * 0.08);
    g.rotation.y = lx * 0.15;
    g.rotation.z = Math.sin(t * 1.3) * 0.02 + Math.sin(t * 14) * 0.015 * joy; // se mueve de gusto

    poseWorld(rig, rig.spine, -ly * 0.04, lx * 0.05, 0);
    poseWorld(rig, rig.neck, -ly * 0.08, lx * 0.1, 0);
    poseWorld(rig, rig.head, -ly * 0.14, lx * 0.18, Math.sin(t * 1.1) * 0.04);

    // base: brazos arriba y palmas al frente, con vaivén lento. Cada ~7 s saluda con la mano
    // derecha un momento (envolvente suave), en vez de oscilar sin parar.
    const lift = Math.sin(t * 2.2) * 3;
    const up = k * 18 + joy * 10;
    const phase = t % 7;
    const env = phase < 1.8 ? Math.sin((phase / 1.8) * Math.PI) : 0;
    const waveL = Math.sin(t * 1.3) * 4;
    const waveR = Math.sin(t * 1.3 + 1.2) * 4 + Math.sin(t * 7) * 16 * env;
    pose(rig, rig.lArm, (ARM_UP + lift + up) * DEG, 0, 0);
    pose(rig, rig.rArm, (ARM_UP + lift + up) * DEG, 0, 0);
    pose(rig, rig.lFore, 0, (-PALM_FRONT + waveL) * DEG, 0);
    pose(rig, rig.rFore, 0, (PALM_FRONT - waveR) * DEG, 0);

    // ojos: miran a un punto frente al osito según el cursor (girados con resorte, con tope de ángulo)
    if (eyes.current.length) {
      _target.set(pointer.x * 2.2, FOCUS_Y + pointer.y * 1.4, 3);
      for (const pivot of eyes.current) {
        const parent = pivot.parent!;
        pivot.getWorldPosition(_eyePos);
        _m4.lookAt(_target, _eyePos, _up); // +Z del pivote hacia el objetivo
        _qWorld.setFromRotationMatrix(_m4);
        parent.getWorldQuaternion(_qParent).invert();
        _qWorld.premultiply(_qParent);
        // tope: no más de ~35° desde el reposo
        const rest = pivot.userData.rest as THREE.Quaternion;
        const ang = rest.angleTo(_qWorld);
        if (ang > 0.6) _qWorld.copy(rest).slerp(_qWorld, 0.6 / ang);
        pivot.quaternion.slerp(_qWorld, Math.min(1, delta * 10));
      }
    }

    // parpadeo: cada 2-5 s; al hacerle clic cierra los ojos un rato (contento) y al estirarlo los entrecierra
    if (blinkT.current < 0 && t > nextBlink.current) blinkT.current = 0;
    let close = 0;
    if (blinkT.current >= 0) {
      blinkT.current += delta;
      // baja rápido (40%) y sube más lento, con suavizado
      const u = blinkT.current / 0.24;
      const lin = u < 0.4 ? u / 0.4 : Math.max(0, 1 - (u - 0.4) / 0.6);
      close = lin * lin * (3 - 2 * lin);
      if (u >= 1) {
        blinkT.current = -1;
        nextBlink.current = t + 2 + Math.random() * 3 + (Math.random() < 0.2 ? -1.5 : 0);
      }
    }
    close = Math.max(close, joy > 0.5 ? (joy - 0.5) * 1.6 : 0, Math.min(0.45, stretch.current * 0.9));
    lidCutRef.current.value = LID_OPEN + (LID_MEET - LID_OPEN) * close;
    lidLowRef.current.value = LID_LOW_OPEN + (LID_MEET - LID_LOW_OPEN) * close;
    for (const lid of lids.current) lid.visible = close > 0.001;
  });

  // ---------- agarrar las patitas: estirar y soltar con rebote de peluche ----------
  // offset = cuánto se jaló la mano (mundo). Agarrada sigue al cursor; suelta, vuelve con un resorte
  // poco amortiguado (rebota) y el brazo se estira/encoge a lo largo del hueso.
  const handHits = useRef<Record<number, THREE.Mesh | null>>({});
  const grabbing = useRef<null | { side: number; delta: THREE.Vector3; z: number }>(null);
  const pullRef = useRef(
    Object.fromEntries(HANDS.map((sd) => [sd, { off: new THREE.Vector3(), vel: new THREE.Vector3(), prev: new THREE.Vector3() }]))
  );
  const camera = useThree((st) => st.camera);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  function handBones(side: number) {
    return side < 0
      ? { arm: rig.lArm, fore: rig.lFore, hand: rig.lHand }
      : { arm: rig.rArm, fore: rig.rFore, hand: rig.rHand };
  }

  function startGrab(side: number, point: THREE.Vector3) {
    const { hand } = handBones(side);
    if (!hand) return;
    hand.getWorldPosition(_v1);
    grabbing.current = { side, delta: point.clone().sub(_v1), z: point.z };
    document.body.style.cursor = 'grabbing';
    playSqueak();
    const up = () => {
      grabbing.current = null;
      document.body.style.cursor = '';
      squash.current = 0.7; // todo el cuerpo se sacude al soltar
      playBoing();
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  /**
   * Mantiene la mano jalada (hand + off) fuera del cuerpo: no puede pasar del hombro hacia el centro
   * y se empuja hacia afuera de dos elipses (cabeza y torso, en el plano de la pantalla).
   * Ajusta off en sitio y dice si tuvo que corregir.
   */
  function constrainHand(hand: THREE.Vector3, off: THREE.Vector3, arm: THREE.Bone) {
    arm.getWorldPosition(_shoulder);
    const sx = Math.sign(_shoulder.x) || 1;
    _v2.copy(hand).add(off);
    let minX = Math.abs(_shoulder.x) * 0.85;
    const ellipses = BODY_ZONES(rig, _v3);
    for (const [cx, cy, rx, ry] of ellipses) {
      const dy = (_v2.y - cy) / ry;
      if (Math.abs(dy) < 1) minX = Math.max(minX, sx * cx + rx * Math.sqrt(1 - dy * dy) + HAND_MARGIN);
    }
    // nunca más afuera que la mano en reposo (si no, empujaría los brazos aunque nadie los jale)
    minX = Math.min(minX, sx * hand.x - 0.05);
    if (sx * _v2.x >= minX) return false;
    _v2.x = sx * minX;
    off.copy(_v2).sub(hand);
    return true;
  }

  function applyGrab(delta: number) {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);
    g.updateMatrixWorld(true);
    let leanX = 0;
    let stretchMax = 0;
    const pointer = pointerRef.current;
    for (const side of HANDS) {
      const { arm, fore, hand } = handBones(side);
      const p = pullRef.current[side];
      const hit = handHits.current[side];
      if (!arm || !fore || !hand) continue;
      arm.scale.set(1, 1, 1);
      arm.updateMatrixWorld(true);
      hand.getWorldPosition(_hand); // mano en la pose base de este cuadro
      const grab = grabbing.current;
      if (grab && grab.side === side) {
        // punto del cursor sobre el plano z de la mano
        raycaster.setFromCamera(pointer, camera);
        _plane.set(_zAxis, -grab.z);
        if (raycaster.ray.intersectPlane(_plane, _v1)) {
          _v1.sub(grab.delta).sub(_hand);
          if (_v1.length() > MAX_PULL) _v1.setLength(MAX_PULL);
          p.prev.copy(p.off);
          p.off.lerp(_v1, Math.min(1, dt * 18));
          p.vel.copy(p.off).sub(p.prev).divideScalar(Math.max(dt, 1e-3)); // inercia al soltar
        }
      } else {
        // resorte: k alto y poco amortiguado = rebote de peluche
        _v1.copy(p.off).multiplyScalar(-SPRING_K).addScaledVector(p.vel, -SPRING_C);
        p.vel.addScaledVector(_v1, dt);
        p.off.addScaledVector(p.vel, dt);
      }
      // límite: la mano no cruza al otro lado ni entra en la cabeza o el torso
      if (constrainHand(_hand, p.off, arm)) {
        // al chocar con el límite se pierde la velocidad hacia adentro (sin atravesar en el rebote)
        p.vel.x *= -0.2;
      }
      if (hit) {
        hit.position.copy(_hand).add(p.off);
      }
      if (p.off.lengthSq() < 1e-6 && p.vel.lengthSq() < 1e-6) continue;

      // girar el brazo (en mundo) para que apunte a la mano jalada y estirarlo a lo largo del hueso
      arm.getWorldPosition(_shoulder);
      _a.copy(_hand).sub(_shoulder);
      _b.copy(_hand).add(p.off).sub(_shoulder);
      const s = THREE.MathUtils.clamp(_b.length() / _a.length(), 0.8, 1.7);
      _qD.setFromUnitVectors(_a.normalize(), _b.normalize());
      arm.parent!.getWorldQuaternion(_qP);
      arm.getWorldQuaternion(_qA);
      _qA.premultiply(_qD).premultiply(_qP.invert());
      arm.quaternion.copy(_qA);
      // eje del hueso = hacia el antebrazo (en local del brazo); volumen aprox. constante
      const ax = fore.position;
      const inv = 1 / Math.sqrt(s);
      const ab = [Math.abs(ax.x), Math.abs(ax.y), Math.abs(ax.z)];
      const i = ab.indexOf(Math.max(...ab));
      arm.scale.set(i === 0 ? s : inv, i === 1 ? s : inv, i === 2 ? s : inv);
      leanX += p.off.x;
      stretchMax = Math.max(stretchMax, Math.abs(s - 1));
    }
    // el cuerpo se deja llevar un poco hacia el jalón y entrecierra los ojos del esfuerzo
    g.position.x = leanX * 0.08;
    g.rotation.z += -leanX * 0.05;
    stretch.current = stretchMax;
  }
  // después de la pose base de este cuadro (los useFrame corren en el orden en que se registran)
  useFrame((_, delta) => applyGrab(delta));

  return (
    <>
      <group ref={group}>
        <primitive object={model} />
        {/* hitbox invisible: el cursor solo prueba contra esta esfera */}
        <mesh
          position={[0, BEAR_HEIGHT * 0.5, 0]}
          visible={false}
          onClick={(e) => {
            e.stopPropagation();
            squash.current = 1;
            joyRef.current = 1;
            playSqueak();
            playPop();
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <sphereGeometry args={[BEAR_HEIGHT * 0.45, 8, 6]} />
          <meshBasicMaterial />
        </mesh>
      </group>
      {/* agarraderas invisibles de las patitas: siguen a la mano cada cuadro */}
      {HANDS.map((side) => (
        <mesh
          key={side}
          ref={(el) => void (handHits.current[side] = el)}
          visible={false}
          onPointerDown={(e) => {
            e.stopPropagation();
            startGrab(side, e.point);
          }}
          onPointerOver={() => (document.body.style.cursor = grabbing.current ? 'grabbing' : 'grab')}
          onPointerOut={() => (document.body.style.cursor = grabbing.current ? 'grabbing' : '')}
        >
          <sphereGeometry args={[HAND_HIT_R, 10, 8]} />
          <meshBasicMaterial />
        </mesh>
      ))}
    </>
  );
}

function Framing() {
  const { camera, size } = useThree();
  const last = useRef(-1);
  const apply = () => {
    const cam = camera as THREE.PerspectiveCamera;
    const halfV = Math.tan((cam.fov * DEG) / 2);
    const aspect = size.width / size.height;
    // alejar si el ancho visible no alcanza (móvil vertical)
    const dist = Math.max(CAM_DIST, MIN_VISIBLE_WIDTH / 2 / (halfV * aspect));
    // con el scroll la cámara baja al centro del osito y se aleja hasta que cabe completo
    const r = ositoView.reveal;
    const t = r * r * (3 - 2 * r);
    const fullDist = Math.max(dist, FULL_VISIBLE_HEIGHT / 2 / halfV);
    const y = THREE.MathUtils.lerp(FOCUS_Y, FULL_FOCUS_Y, t);
    cam.position.set(0, y, THREE.MathUtils.lerp(dist, fullDist, t));
    cam.lookAt(0, y, 0);
    last.current = r;
  };
  useEffect(() => {
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size]);
  useFrame(() => {
    if (ositoView.reveal !== last.current) apply();
  });
  return null;
}

export default function OsitoScene({ paused = false, onReady }: { paused?: boolean; onReady?: () => void }) {
  // fuera de pantalla (al bajar al grid) el osito deja de renderizar: cero costo de GPU
  const wrap = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrap} className="h-full w-full">
    <Canvas
      frameloop={onScreen && !paused ? 'always' : 'never'}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 28, position: [0, FOCUS_Y, CAM_DIST], near: 0.1, far: 50 }}
      style={{ background: 'transparent' }}
    >
      <hemisphereLight args={['#fff4ea', '#9b7fd9', 1.1]} />
      <directionalLight position={[3, 5, 6]} intensity={2.2} color="#fff1e0" />
      {/* contraluz lila para separar el pelo del fondo */}
      <directionalLight position={[-4, 3, -4]} intensity={1.6} color="#c9a8ff" />
      {/* environment local, sin descargar HDRI */}
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2} position={[0, 4, 5]} scale={[8, 4, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.5} position={[-5, 1, 0]} rotation-y={Math.PI / 2} scale={[6, 4, 1]} color="#d8c2ff" />
        <Lightformer form="rect" intensity={1} position={[5, 1, 0]} rotation-y={-Math.PI / 2} scale={[6, 4, 1]} color="#ffd9b8" />
      </Environment>
      <Framing />
      <Suspense fallback={null}>
        <Bear onReady={onReady} />
      </Suspense>
    </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
useGLTF.preload(EYE_URL);
