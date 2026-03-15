"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface RepoInfo {
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  owner: string;
  topics: string[];
  default_branch: string;
  open_issues: number;
  watchers: number;
}

interface Contributor {
  login: string;
  contributions: number;
}

interface Branch {
  name: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
}

interface KnowledgeGraphProps {
  repoUrl: string;
  onClose: () => void;
}

const getNodeColors = (isDark: boolean): Record<string, { hex: number; css: string; glow: string }> => ({
  repo:        { hex: isDark ? 0x00ff41 : 0x2563eb, css: isDark ? '#00ff41' : '#2563eb', glow: isDark ? '#00ff41' : '#2563eb' },
  dir:         { hex: isDark ? 0x00d4ff : 0x0891b2, css: isDark ? '#00d4ff' : '#0891b2', glow: isDark ? '#00d4ff' : '#0891b2' },
  file:        { hex: isDark ? 0xff00ff : 0xd946ef, css: isDark ? '#ff00ff' : '#d946ef', glow: isDark ? '#ff00ff' : '#d946ef' },
  contributor: { hex: isDark ? 0xffff00 : 0xf59e0b, css: isDark ? '#ffff00' : '#f59e0b', glow: isDark ? '#ffff00' : '#f59e0b' },
  branch:      { hex: isDark ? 0xff6600 : 0xea580c, css: isDark ? '#ff6600' : '#ea580c', glow: isDark ? '#ff6600' : '#ea580c' },
  topic:       { hex: isDark ? 0x00ff88 : 0x10b981, css: isDark ? '#00ff88' : '#10b981', glow: isDark ? '#00ff88' : '#10b981' },
  stats:       { hex: isDark ? 0xff3366 : 0xdc2626, css: isDark ? '#ff3366' : '#dc2626', glow: isDark ? '#ff3366' : '#dc2626' },
  language:    { hex: isDark ? 0x9966ff : 0x7c3aed, css: isDark ? '#9966ff' : '#7c3aed', glow: isDark ? '#9966ff' : '#7c3aed' },
});

// Even distribution on sphere surface
function fibonacciSphere(n: number, radius: number): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(n - 1, 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push([Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius]);
  }
  return pts;
}

// Flat filled circle (DoubleSide so visible from any angle)
function makeCircleMesh(THREE: any, color: number, radius: number, opacity = 0.9) {
  const geo = new THREE.CircleGeometry(radius, 48);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

// Thin outline ring
function makeRingMesh(THREE: any, color: number, innerR: number, outerR: number) {
  const geo = new THREE.RingGeometry(innerR, outerR, 48);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ repoUrl, onClose }) => {
  const mountRef    = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);
  const frameRef    = useRef<number>(0);
  const nodesRef    = useRef<any[]>([]);
  const nodeDataRef = useRef<GraphNode[]>([]);
  const globeRef    = useRef<any>(null);

  // All rotation state lives here — never in React state (avoids re-renders)
  const rotRef = useRef({
    manualX:  0,      // accumulated pitch from drag
    manualY:  0,      // accumulated yaw from drag
    velX:     0,      // inertia
    velY:     0,
    autoY:    0,      // auto-spin angle (increments every frame)
    dragging: false,
    lastX:    0,
    lastY:    0,
  });

  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [repoInfo,    setRepoInfo]    = useState<RepoInfo | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [matrixChars, setMatrixChars] = useState<
    { char: string; x: number; y: number; speed: number; opacity: number }[]
  >([]);
  const [themeMode,   setThemeMode]   = useState<'light' | 'dark' | 'system'>('system');
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  // Matrix rain
  useEffect(() => {
    const chars = 'アイウエオカキクケコサシスセソ0123456789ABCDEF><{}[]';
    const rain = Array.from({ length: 55 }, () => ({
      char:    chars[Math.floor(Math.random() * chars.length)],
      x:       Math.random() * 100,
      y:       Math.random() * 100,
      speed:   0.35 + Math.random() * 1.1,
      opacity: 0.12 + Math.random() * 0.38,
    }));
    setMatrixChars(rain);
    const iv = setInterval(() => {
      setMatrixChars(prev =>
        prev.map(d => ({
          ...d,
          y:    d.y > 105 ? -5 : d.y + d.speed,
          char: Math.random() > 0.97 ? chars[Math.floor(Math.random() * chars.length)] : d.char,
        }))
      );
    }, 85);
    return () => clearInterval(iv);
  }, []);

  const parseGitHubUrl = (url: string) => {
    const m = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    return m ? { owner: m[1], repo: m[2].replace('.git', '') } : null;
  };

  // Canvas-texture label sprite — always billboards toward camera (Three.js Sprite)
  const makeSprite = useCallback((THREE: any, label: string, type: string, isDarkMode: boolean, isRepo = false) => {
    const W = isRepo ? 260 : 190;
    const H = isRepo ? 68  : 50;
    const canvas  = document.createElement('canvas');
    canvas.width  = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);

    const NODE_COLORS = getNodeColors(isDarkMode);
    const color = NODE_COLORS[type]?.css ?? '#ffffff';
    ctx.clearRect(0, 0, W, H);

    // Pill background
    ctx.beginPath();
    ctx.roundRect(3, 3, W - 6, H - 6, 8);
    ctx.fillStyle = 'rgba(0,6,14,0.86)';
    ctx.fill();

    // Glowing border
    ctx.shadowColor = color;
    ctx.shadowBlur  = isRepo ? 14 : 8;
    ctx.strokeStyle = color;
    ctx.lineWidth   = isRepo ? 2.5 : 1.8;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Label text (word-wrapped, max 2 lines)
    ctx.fillStyle    = '#ffffff';
    ctx.font         = isRepo ? 'bold 13px monospace' : '11px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const maxW  = W - 18;
    const words = label.split(/[\s/_.\-]/);
    const lines: string[] = [];
    let cur = '';
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = word; }
      else cur = test;
    }
    lines.push(cur);
    const finalLines = lines.slice(0, 2);
    const lineH  = isRepo ? 17 : 13;
    const startY = H / 2 - ((finalLines.length - 1) * lineH) / 2;
    finalLines.forEach((line, i) => ctx.fillText(line, W / 2, startY + i * lineH));

    const tex    = new THREE.CanvasTexture(canvas);
    const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    const aspect = W / H;
    sprite.scale.set((isRepo ? 3.1 : 2.2) * aspect, isRepo ? 3.1 : 2.2, 1);
    return sprite;
  }, []);

  const buildScene = useCallback(async (nodes: GraphNode[], edges: [string, string][], isDarkMode: boolean) => {
    if (!mountRef.current) return;

    const THREE = await import('three');
    const NODE_COLORS = getNodeColors(isDarkMode);

    // Teardown previous
    cancelAnimationFrame(frameRef.current);
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current.domElement.remove();
      rendererRef.current = null;
    }

    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(isDarkMode ? 0x000000 : 0xf0f4f8, 0);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene & Camera ─────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 1000);
    camera.position.set(0, 0, 28);

    // ── Globe group ────────────────────────────────────────────────────────
    // Everything inside this group. We set globe.quaternion directly each
    // frame → guaranteed 360° on both axes with no gimbal lock.
    const globe = new THREE.Group();
    scene.add(globe);
    globeRef.current = globe;

    // Reference wireframe sphere
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(10.5, 28, 18),
      new THREE.MeshBasicMaterial({ color: isDarkMode ? 0x00ff41 : 0x2563eb, wireframe: true, transparent: true, opacity: isDarkMode ? 0.032 : 0.05 })
    ));

    // ── Place nodes ────────────────────────────────────────────────────────
    const nonRepo   = nodes.filter(n => n.type !== 'repo');
    const positions = fibonacciSphere(nonRepo.length, 10);
    const meshes: any[]      = [];
    const data: GraphNode[]  = [];
    const posMap = new Map<string, any>(); // id → THREE.Vector3

    // Central repo node
    const repoNode = nodes.find(n => n.type === 'repo')!;
    {
      const R    = 1.25;
      const fill = makeCircleMesh(THREE, NODE_COLORS.repo.hex, R, 0.92);
      fill.position.set(0, 0, 0);
      globe.add(fill);

      // Crisp outline ring (index 1 in globe.children)
      const ring = makeRingMesh(THREE, NODE_COLORS.repo.hex, R, R * 1.22);
      ring.position.set(0, 0, 0);
      globe.add(ring);

      // Pulsing outer halo (index 2 — referenced in animate loop)
      const halo = makeRingMesh(THREE, NODE_COLORS.repo.hex, R * 1.22, R * 1.65);
      (halo.material as any).opacity = 0.22;
      halo.position.set(0, 0, 0);
      globe.add(halo);

      const sprite = makeSprite(THREE, repoNode.label, 'repo', isDarkMode, true);
      sprite.position.set(0, R + 1.7, 0);
      globe.add(sprite);

      meshes.push(fill);
      data.push(repoNode);
      posMap.set(repoNode.id, new THREE.Vector3(0, 0, 0));
    }

    // Satellite nodes (flat circles facing outward along the sphere normal)
    nonRepo.forEach((node, i) => {
      const [x, y, z] = positions[i];
      const color  = NODE_COLORS[node.type]?.hex ?? 0xffffff;
      const R      = node.type === 'topic' ? 0.40 : 0.58;
      const normal = new THREE.Vector3(x, y, z).normalize();

      // Filled circle
      const fill = makeCircleMesh(THREE, color, R, 0.88);
      fill.position.set(x, y, z);
      fill.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      globe.add(fill);

      // Outline ring
      const ring = makeRingMesh(THREE, color, R, R * 1.20);
      ring.position.set(x, y, z);
      ring.quaternion.copy(fill.quaternion);
      globe.add(ring);

      // Soft glow disc
      const glow = makeCircleMesh(THREE, color, R * 1.75, 0.06);
      glow.position.set(x, y, z);
      glow.quaternion.copy(fill.quaternion);
      globe.add(glow);

      // Label sprite offset outward along normal
      const labelOffset = normal.clone().multiplyScalar(R + 1.2);
      const sprite = makeSprite(THREE, node.label, node.type, isDarkMode);
      sprite.position.set(x + labelOffset.x, y + labelOffset.y, z + labelOffset.z);
      globe.add(sprite);

      meshes.push(fill);
      data.push(node);
      posMap.set(node.id, new THREE.Vector3(x, y, z));
    });

    nodesRef.current = meshes;
    nodeDataRef.current = data;

    // ── Edges ──────────────────────────────────────────────────────────────
    edges.forEach(([src, tgt]) => {
      const a = posMap.get(src);
      const b = posMap.get(tgt);
      if (!a || !b) return;
      globe.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([a, b]),
        new THREE.LineBasicMaterial({ color: isDarkMode ? 0x00ff41 : 0x2563eb, transparent: true, opacity: isDarkMode ? 0.14 : 0.25 })
      ));
    });

    // ── Raycaster (hover) ──────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();

    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const idx = meshes.indexOf(hits[0].object);
        setHoveredNode(data[idx] ?? null);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredNode(null);
        renderer.domElement.style.cursor = rotRef.current.dragging ? 'grabbing' : 'grab';
      }
    };

    // ── Drag handlers ──────────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      rotRef.current.dragging = true;
      rotRef.current.lastX    = e.clientX;
      rotRef.current.lastY    = e.clientY;
      rotRef.current.velX     = 0;
      rotRef.current.velY     = 0;
      renderer.domElement.style.cursor = 'grabbing';
    };
    const onMouseUp = () => {
      rotRef.current.dragging = false;
      renderer.domElement.style.cursor = 'grab';
    };
    const onWindowMouseMove = (e: MouseEvent) => {
      if (!rotRef.current.dragging) return;
      const dx = e.clientX - rotRef.current.lastX;
      const dy = e.clientY - rotRef.current.lastY;
      // Accumulate directly into manual angles AND set velocity for inertia
      rotRef.current.manualY += dx * 0.009;
      rotRef.current.manualX += dy * 0.009;
      rotRef.current.velY     = dx * 0.009;
      rotRef.current.velX     = dy * 0.009;
      rotRef.current.lastX    = e.clientX;
      rotRef.current.lastY    = e.clientY;
    };

    // Touch
    let lastTX = 0, lastTY = 0;
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      rotRef.current.dragging = true;
      lastTX = e.touches[0].clientX;
      lastTY = e.touches[0].clientY;
      rotRef.current.velX = 0;
      rotRef.current.velY = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!rotRef.current.dragging) return;
      const dx = e.touches[0].clientX - lastTX;
      const dy = e.touches[0].clientY - lastTY;
      rotRef.current.manualY += dx * 0.009;
      rotRef.current.manualX += dy * 0.009;
      rotRef.current.velY     = dx * 0.009;
      rotRef.current.velX     = dy * 0.009;
      lastTX = e.touches[0].clientX;
      lastTY = e.touches[0].clientY;
    };
    const onTouchEnd = () => { rotRef.current.dragging = false; };

    // Scroll to zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(14, Math.min(52, camera.position.z + e.deltaY * 0.04));
    };

    // Resize
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    renderer.domElement.addEventListener('mousemove',  onMouseMove);
    renderer.domElement.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mouseup',                 onMouseUp);
    window.addEventListener('mousemove',               onWindowMouseMove);
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
    renderer.domElement.addEventListener('touchmove',  onTouchMove,  { passive: false });
    renderer.domElement.addEventListener('touchend',   onTouchEnd);
    renderer.domElement.addEventListener('wheel',      onWheel,      { passive: false });
    window.addEventListener('resize',                  onResize);

    // ── Quaternion helpers ─────────────────────────────────────────────────
    const qX    = new THREE.Quaternion();
    const qY    = new THREE.Quaternion();
    const axisX = new THREE.Vector3(1, 0, 0);
    const axisY = new THREE.Vector3(0, 1, 0);

    // Halo reference (3rd child of globe = index 2)
    let haloPhase = 0;

    // ── Animate ────────────────────────────────────────────────────────────
    //
    // Rotation strategy (no gimbal lock, true 360° on all axes):
    //
    //   globe.quaternion = Ry(autoY + manualY) * Rx(manualX)
    //
    // • autoY advances every frame at a constant rate → continuous spin
    // • manualY/X accumulate from drag → user steers freely in both axes
    // • After drag release, velX/velY provide inertial coast then die off
    // • The quaternion multiply order means: first tilt up/down (Rx),
    //   then spin left/right (Ry) — exactly how a physical globe works
    //
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const rot = rotRef.current;

      // Always advance auto-spin
      rot.autoY += 0.0025;

      // Inertia: coast after drag release
      if (!rot.dragging) {
        rot.manualX += rot.velX;
        rot.manualY += rot.velY;
        rot.velX *= 0.88;
        rot.velY *= 0.88;
      }

      // Hard clamp pitch so it can't flip past vertical
      rot.manualX = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, rot.manualX));

      // Compose final orientation
      qY.setFromAxisAngle(axisY, rot.autoY + rot.manualY);
      qX.setFromAxisAngle(axisX, rot.manualX);
      globe.quaternion.copy(qY).multiply(qX);

      // Pulse halo
      haloPhase += 0.038;
      const halo = globe.children[2] as any;
      if (halo?.material) {
        (halo.material as any).opacity = 0.10 + 0.15 * (0.5 + 0.5 * Math.sin(haloPhase));
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.domElement.removeEventListener('mousemove',  onMouseMove);
      renderer.domElement.removeEventListener('mousedown',  onMouseDown);
      window.removeEventListener('mouseup',                 onMouseUp);
      window.removeEventListener('mousemove',               onWindowMouseMove);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove',  onTouchMove);
      renderer.domElement.removeEventListener('touchend',   onTouchEnd);
      renderer.domElement.removeEventListener('wheel',      onWheel);
      window.removeEventListener('resize',                  onResize);
      renderer.dispose();
    };
  }, [makeSprite]);

  const fetchRepoData = useCallback(async (owner: string, repo: string) => {
    setLoading(true);
    setError('');
    const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    try {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (!repoRes.ok) throw new Error('Failed to fetch repository. Check the URL and try again.');
      const repoData = await repoRes.json();

      setRepoInfo({
        name:           repoData.name,
        description:    repoData.description ?? 'No description',
        stars:          repoData.stargazers_count,
        forks:          repoData.forks_count,
        language:       repoData.language ?? 'Unknown',
        owner:          repoData.owner.login,
        topics:         repoData.topics ?? [],
        default_branch: repoData.default_branch,
        open_issues:    repoData.open_issues_count,
        watchers:       repoData.watchers_count,
      });

      const [contentsRes, contributorsRes, branchesRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}/contents`),
        fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=10`),
        fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=10`),
      ]);

      const contents:     any[]         = contentsRes.ok     ? await contentsRes.json()     : [];
      const contributors: Contributor[] = contributorsRes.ok ? await contributorsRes.json() : [];
      const branches:     Branch[]      = branchesRes.ok     ? await branchesRes.json()     : [];

      const nodes: GraphNode[]       = [{ id: 'repo', label: repoData.name, type: 'repo' }];
      const edges: [string, string][] = [];
      const add = (id: string, label: string, type: string) => {
        nodes.push({ id, label, type });
        edges.push(['repo', id]);
      };

      [
        { id: 'stars',    label: `★ ${repoData.stargazers_count}`, type: 'stats' },
        { id: 'forks',    label: `⑂ ${repoData.forks_count}`,      type: 'stats' },
        { id: 'issues',   label: `⚠ ${repoData.open_issues_count}`, type: 'stats' },
        { id: 'watchers', label: `👁 ${repoData.watchers_count}`,   type: 'stats' },
      ].forEach(s => add(s.id, s.label, s.type));

      if (repoData.language) add('language', repoData.language, 'language');
      (repoData.topics ?? []).slice(0, 6).forEach((t: string, i: number) =>
        add(`topic-${i}`, `#${t}`, 'topic'));
      contents.slice(0, 14).forEach((item: any, i: number) =>
        add(`file-${i}`, item.name, item.type === 'dir' ? 'dir' : 'file'));
      contributors.slice(0, 8).forEach((c: Contributor, i: number) =>
        add(`contrib-${i}`, c.login, 'contributor'));
      branches.slice(0, 5).forEach((b: Branch, i: number) =>
        add(`branch-${i}`, b.name, 'branch'));

      await buildScene(nodes, edges, isDarkMode);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [buildScene]);

  useEffect(() => {
    const parsed = parseGitHubUrl(repoUrl);
    if (parsed) {
      fetchRepoData(parsed.owner, parsed.repo);
    } else {
      setError('Invalid GitHub URL');
      setLoading(false);
    }
    return () => {
      cancelAnimationFrame(frameRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, [repoUrl, fetchRepoData]);

  // Theme variables
  const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const bgColor = isDarkMode ? '#000' : '#f0f4f8';
  const panelBg = isDarkMode ? 'rgba(0,10,20,0.88)' : 'rgba(240,244,248,0.92)';
  const panelBorder = isDarkMode ? 'rgba(0,255,65,0.3)' : 'rgba(100,150,200,0.3)';
  const panelBorderHover = isDarkMode ? 'rgba(0,255,65,0.15)' : 'rgba(100,150,200,0.15)';
  const headerBg = isDarkMode ? 'rgba(0,18,28,0.7)' : 'rgba(240,244,248,0.8)';
  const textColor = isDarkMode ? '#fff' : '#1a1a2e';
  const accentColor = isDarkMode ? '#00ff41' : '#2563eb';
  const matrixColor = isDarkMode ? 'rgba(0,255,65,0.35)' : 'rgba(37,99,235,0.3)';

  return (() => {
    return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* Matrix rain */}
      <div style={{ position: 'absolute', inset: 0, background: bgColor, overflow: 'hidden', pointerEvents: 'none' }}>
        {matrixChars.map((d, i) => (
          <span key={i} style={{
            position: 'absolute', left: `${d.x}%`, top: `${d.y}%`,
            color: accentColor, fontFamily: 'monospace', fontSize: 13,
            opacity: d.opacity, userSelect: 'none',
          }}>{d.char}</span>
        ))}
      </div>

      {/* Panel */}
      <div style={{
        position: 'relative', width: '95vw', height: '90vh', borderRadius: 16, overflow: 'hidden',
        background: panelBg,
        border: `1px solid ${panelBorder}`,
        boxShadow: isDarkMode ? '0 0 60px rgba(0,255,65,0.12), inset 0 0 80px rgba(0,255,65,0.03)' : '0 0 30px rgba(100,150,200,0.1), inset 0 0 40px rgba(100,150,200,0.02)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', position: 'relative', zIndex: 10,
          borderBottom: `1px solid ${panelBorderHover}`,
          background: headerBg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 9, height: 9, borderRadius: '50%', background: accentColor,
              boxShadow: `0 0 8px ${accentColor}`, animation: 'pulse 2s infinite',
            }} />
            <span style={{ color: textColor, fontFamily: 'monospace', fontSize: 17, fontWeight: 700, textShadow: `0 0 8px ${accentColor}` }}>
              Repository Knowledge Globe
            </span>
          </div>

          {repoInfo && (
            <div style={{ display: 'flex', gap: 20, fontSize: 13, fontFamily: 'monospace', color: textColor }}>
              <span style={{ color: isDarkMode ? '#ffcc00' : '#f59e0b' }}>★ {repoInfo.stars.toLocaleString()}</span>
              <span style={{ color: isDarkMode ? '#00d4ff' : '#06b6d4' }}>⑂ {repoInfo.forks.toLocaleString()}</span>
              <span style={{ color: isDarkMode ? '#9966ff' : '#8b5cf6' }}>{repoInfo.language}</span>
            </div>
          )}

          {hoveredNode && (
            <div style={{
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
              background: panelBg,
              border: `1px solid ${getNodeColors(isDarkMode)[hoveredNode.type]?.css ?? '#fff'}`,
              borderRadius: 8, padding: '4px 14px', pointerEvents: 'none',
              color: textColor, fontFamily: 'monospace', fontSize: 13,
              boxShadow: `0 0 14px ${getNodeColors(isDarkMode)[hoveredNode.type]?.css ?? '#fff'}55`,
            }}>
              <span style={{ color: getNodeColors(isDarkMode)[hoveredNode.type]?.css ?? '#fff', marginRight: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                {hoveredNode.type}
              </span>
              {hoveredNode.label}
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            style={{
              position: 'relative', zIndex: 20,
              padding: '6px 10px', borderRadius: 6,
              background: panelBorderHover,
              border: `1px solid ${accentColor}`,
              color: accentColor, cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 13, fontWeight: 600,
              transition: 'all 0.2s', display: 'flex', alignItems: 'center',
              boxShadow: `0 0 8px ${accentColor}22`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = accentColor;
              e.currentTarget.style.color = panelBg;
              e.currentTarget.style.boxShadow = `0 0 12px ${accentColor}66`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = panelBorderHover;
              e.currentTarget.style.color = accentColor;
              e.currentTarget.style.boxShadow = `0 0 8px ${accentColor}22`;
            }}>
            {themeMode === 'dark' ? '🌙' : themeMode === 'light' ? '☀️' : '🖥️'}
          </button>

          {/* Theme Dropdown */}
          {isThemeOpen && (
            <div style={{
              position: 'absolute', top: 50, right: 20, zIndex: 30,
              background: panelBg, border: `1px solid ${panelBorder}`,
              borderRadius: 8, overflow: 'hidden',
              boxShadow: isDarkMode ? '0 8px 32px rgba(0,255,65,0.15)' : '0 8px 32px rgba(100,150,200,0.15)',
            }}>
              {(['dark', 'light', 'system'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setThemeMode(mode);
                    setIsThemeOpen(false);
                  }}
                  style={{
                    display: 'block', width: '100%',
                    padding: '8px 16px', border: 'none',
                    background: themeMode === mode ? accentColor : 'transparent',
                    color: themeMode === mode ? '#000' : textColor,
                    textAlign: 'left', cursor: 'pointer',
                    fontFamily: 'monospace', fontSize: 13,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (themeMode !== mode) {
                      e.currentTarget.style.background = `${accentColor}44`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (themeMode !== mode) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}>
                  {mode === 'dark' ? '🌙 Dark' : mode === 'light' ? '☀️ Light' : '🖥️ System'}
                </button>
              ))}
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              border: isDarkMode ? '1px solid rgba(255,50,50,0.5)' : '1px solid rgba(200,50,50,0.6)',
              fontFamily: 'monospace',
              background: isDarkMode ? 'rgba(255,0,0,0.14)' : 'rgba(255,100,100,0.15)',
              color: isDarkMode ? '#ff5555' : '#dc2626', transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isDarkMode ? 'rgba(255,0,0,0.3)' : 'rgba(255,100,100,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDarkMode ? 'rgba(255,0,0,0.14)' : 'rgba(255,100,100,0.15)'; }}
          >
            ✕ Close
          </button>
        </div>

        {/* Three.js mount point */}
        <div ref={mountRef} style={{ width: '100%', height: 'calc(100% - 57px)', cursor: 'grab' }} />

        {/* Loading */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDarkMode ? 'rgba(0,0,0,0.65)' : 'rgba(100,100,100,0.3)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, margin: '0 auto 16px',
                border: `3px solid ${isDarkMode ? 'rgba(0,255,65,0.18)' : 'rgba(100,150,200,0.25)'}`,
                borderTopColor: accentColor,
                borderRadius: '50%', animation: 'spin 0.75s linear infinite',
              }} />
              <p style={{ color: accentColor, fontFamily: 'monospace', fontSize: 14, textShadow: `0 0 8px ${accentColor}` }}>
                Building knowledge globe...
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(100,100,100,0.4)',
          }}>
            <div style={{
              padding: '24px 32px', borderRadius: 12, textAlign: 'center',
              background: panelBg,
              border: `1px solid ${isDarkMode ? 'rgba(255,0,0,0.3)' : 'rgba(200,50,50,0.4)'}`,
            }}>
              <p style={{ color: isDarkMode ? '#ff5555' : '#dc2626', fontFamily: 'monospace', fontSize: 15 }}>{error}</p>
            </div>
          </div>
        )}

        {/* Legend — using mini SVG circles to match the actual node style */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 20,
          background: panelBg,
          border: `1px solid ${panelBorder}`,
          borderRadius: 10, padding: '10px 14px',
        }}>
          <div style={{ color: accentColor, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, marginBottom: 7, letterSpacing: 2 }}>
            LEGEND
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 18px' }}>
            {Object.entries(getNodeColors(isDarkMode)).map(([type, c]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="13" height="13" viewBox="0 0 13 13">
                  <circle cx="6.5" cy="6.5" r="5"   fill={c.css} opacity="0.85" />
                  <circle cx="6.5" cy="6.5" r="5.8" fill="none" stroke={c.css} strokeWidth="1.2" />
                </svg>
                <span style={{ color: textColor, fontFamily: 'monospace', fontSize: 11, textTransform: 'capitalize' }}>{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls hint */}
        <div style={{
          position: 'absolute', bottom: 12, right: 12, zIndex: 20,
          background: panelBg,
          border: `1px solid ${panelBorder}`,
          borderRadius: 10, padding: '8px 14px',
          color: textColor, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.7,
        }}>
          <div>↔↕ Drag to rotate in any direction</div>
          <div>⟳ Auto-spins continuously</div>
          <div>⊕ Scroll to zoom</div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.45;transform:scale(0.82)} }
        @keyframes spin  { to { transform: rotate(360deg) } }
      `}</style>
    </div>
    );
  })();
};

export default KnowledgeGraph;