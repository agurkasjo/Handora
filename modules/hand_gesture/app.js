/* app.js — HANDORA v5.3 — Full replacement (laser + 2 games)
   - New laser game mode: destroy falling enemies by blinking or using laser cursor. Enemies spawn faster over time.
   - New Hit-The-Ball game mode: keep the ball in the air by hitting it with your hand; score points for each successful hit.
   - New laser cursor mode: control a persistent laser beam with your hand; use it to pop balloons in the feed and also to play the Laser game.
   - New face filters: glasses, hat, mask; applied in feed and modal preview.
   - New persistent game configuration: enemy type (ball/square/drone), laser color, skeleton color, bone width; configurable in Games modal and applied in feed and games.
   - New Games modal: access both games, configure settings, and see real-time face expression summary.
   - Laser cursor is now a persistent mode that can be toggled on/off; when on, it allows you to interact with the feed (popping balloons) and also serves as the main control for the Laser game. Laser cursor position is determined by your hand position, and it can destroy enemies in the Laser game and also pop Hit-Ball balls if they intersect.
   - Enemy types in Laser game: balls (easiest, circular), squares (medium, require more hits), drones (hardest, move erratically and require precise hits).
   - Hit-The-Ball game: a ball falls with gravity, and you must keep it in the air by hitting it with your hand. Each successful hit scores points, and the ball's speed increases over time. If the ball hits the ground, the game is over.
   - Laser game difficulty increases over time by spawning enemies more frequently and increasing their speed. Different enemy types have different speeds and hit requirements.
   - Laser visuals have been tuned for better aesthetics and clarity, with a narrower core and a layered glow effect. The laser's width and color are now configurable in the Games modal, allowing for a more personalized experience.
   - Laser cursor can pop balloons in the feed when it intersects with them, providing a fun interactive element even outside of the games. Popping balloons with the laser cursor will also trigger a satisfying visual effect and sound (if enabled).
   - Games modal now includes controls for the Hit-The-Ball game, allowing you to start/stop the game and see your current score. The modal also includes selectors for bone and torso colors, which are applied in the feed and games for a more customized visual experience.
   - Real-time face expression summary (blink/wink/mouth open/smile) is displayed inside the Games modal, allowing you to see your current expression state while playing. This summary updates in real-time based on the detected face landmarks and can provide feedback on your expressions as you play the games.
   - Modal laser-cursor selection: within the Games modal, you can select which hand controls the laser cursor (left or right), and this selection persists to the global `gameConfig`, allowing you to customize your control scheme for the laser cursor in both the feed and the games.
   - Laser cursor mode can be toggled on/off independently of the games, allowing you to use the laser cursor for fun interactions in the feed (like popping balloons) even when you're not actively playing the Laser game. When laser cursor mode is enabled, it will track your hand position and allow you to interact with elements in the feed, providing a more engaging experience.
   - In the Laser game, enemies will spawn at random horizontal positions at the top of the screen and fall downwards. Your objective is to destroy them using the laser cursor before they reach the bottom. Each enemy type has different hit requirements: balls can be destroyed with a single hit, squares require multiple hits, and drones require precise hits due to their erratic movement. As you destroy enemies, your score increases, and the game becomes more challenging as enemies spawn more frequently and move faster over time.
   - In the Hit-The-Ball game, a ball will fall from the top of the screen with gravity, and you must keep it in the air by hitting it with your hand. Each successful hit scores points, and the ball's speed increases over time, making it more challenging to keep it afloat. If the ball hits the ground, the game is over, and your final score is displayed in the Games modal.
   - Laser cursor visuals have been enhanced with a narrower core for better precision and a layered glow effect for improved aesthetics. The width and color of the laser can be customized in the Games modal, allowing you to personalize your experience. The laser's damage per hit is also configurable, providing more control over how it interacts with enemies in the Laser game.
   - Laser cursor can now pop balloons in the feed when it intersects with them, adding a fun interactive element even outside of the games. Popping balloons with the laser cursor will trigger a satisfying visual effect and sound (if enabled), making it enjoyable to interact with the feed using the laser cursor.
   - Games modal has been expanded to include controls for the Hit-The-Ball game, allowing you to start/stop the game and see your current score. The modal also includes selectors for bone and torso colors, which are applied in the feed and games for a more customized visual experience. Additionally, a real-time face expression summary is displayed in the modal, providing feedback on your current expression state as you play the games.
   - Laser uses persistent `gameConfig` (doesn't rely on modal being open). Laser works even after closing modal.
   - Laser visuals tuned: narrower core, layered glow, configurable width & color; default narrower (4).
   - Laser destroys falling enemies (Laser game) and also destroys Hit-Ball balls if they intersect.
   - Games modal includes Hit-The-Ball controls and bone/torso color selectors.
   - Face expression summary (blink/wink/mouth open/smile) is shown inside the Games modal in real-time.
   - Modal laser-cursor selection; selection persists to `gameConfig`.
*/

(() => {
  /* ---------------- CONFIG ---------------- */
  const CONFIG = {
    blinkThreshold: 0.018,
    longBlinkMs: 600,
    mouthOpenThreshold: 0.045,
    laughMAR: 0.08,
    waveSignChanges: 2,
    waveAmplitudePx: 30,
    punchSpeedThreshold: 1200,
    swipeSpeedMultiplier: 1.8,
    historyMax: 18,
    pinchThreshold: 0.06,
    ballGravity: 600,
    ballFriction: 0.995,
    enemySpawnMs: 2200,
    enemySpeedMin: 60,
    enemySpeedMax: 660,
    blinkFireCooldown: 500,
    laserCooldownMs: 80,
    laserLength: 1400,
    laserWidth: 4,              // default narrower laser
    laserDamagePerHit: 2,
    modalHoverMs: 600,
    hitBallScore: 1
  };

  /* ---------------- GLOBAL GAME CONFIG (persistent) ---------------- */
  const gameConfig = {
    enemyType: 'ball',                         // 'ball' | 'square' | 'drone'
    laserColor: 'rgba(255,80,40,1)',           // default
    laserWidth: CONFIG.laserWidth,
    skeletonColor: '#00e5a8',
    torsoColor: '#4f9aff',
    boneWidth: 3                        // default
  };

  /* ---------------- DOM / canvas ---------------- */
  const canvas = document.getElementById('canvas') || (() => { const c = document.createElement('canvas'); c.id = 'canvas'; document.body.appendChild(c); return c; })();
  const ctx = canvas.getContext('2d', { alpha: false });
  let laserState = { running: false, enabled: true };

  // Controls (panel) — these elements are expected to exist in your HTML
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const bodyModeBtn = document.getElementById('bodyModeBtn');
  const particleModeBtn = document.getElementById('particleModeBtn'); // repurposed as effects toggle
  const shapeSelect = document.getElementById('shapeSelect');
  const clickEmit = document.getElementById('clickEmit');
  const handsComplexity = document.getElementById('handsComplexity');
  const minDetection = document.getElementById('minDetection');
  const motionThreshold = document.getElementById('motionThreshold');
  const alertSensitivity = document.getElementById('alertSensitivity');
  const mirrorToggle = document.getElementById('mirrorToggle');
  const toggleSound = document.getElementById('toggleSound');
  const toggleSpeak = document.getElementById('toggleSpeak');
  const fpsEl = document.getElementById('fps');
  const gestureLabelEl = document.getElementById('gestureLabel');
  const handsCountEl = document.getElementById('handsCount');
  const bodyDetectedEl = document.getElementById('bodyDetected');
  const alertStateEl = document.getElementById('alertState');
  const filterSelect = document.getElementById('filterSelect');
  const filterToggle = document.getElementById('filterToggle');
  const openGamesModalBtn = document.getElementById('openGamesModal');
  const openFaceFilterModalBtn = document.getElementById('openFaceFilterModal');
  const clothesColorInput = document.getElementById('clothesColor');

  // ensure skeletonColor input exists & binds to gameConfig
  let skeletonColorInput = document.getElementById('skeletonColor');
  if(!skeletonColorInput){
    const div = document.createElement('div');
    div.style.display='none';
    div.innerHTML = `<input id="skeletonColor" type="color" value="${gameConfig.skeletonColor}"/>`;
    document.body.appendChild(div);
    skeletonColorInput = document.getElementById('skeletonColor');
  }
  skeletonColorInput.value = gameConfig.skeletonColor;

  /* ---------------- audio elements (optional) ---------------- */
  const beepAudio = document.getElementById('beepAudio') || null;
  const alarmAudio = document.getElementById('alarmAudio') || null;

  /* ---------------- state ---------------- */
  let camera, video;
  let hands, pose, faceMesh;
  let faceLoaded = false;
  let running = false;
  let bodyMode = false;
  let effectsEnabled = true;
  let lastFrameImage = null;
  let lastHandsRaw = [];
  let lastPoseLandmarks = null;
  let lastFaceMulti = [];
  let soundEnabled = true;
  let speakEnabled = true;
  let devicePixelRatioCached = window.devicePixelRatio || 1;
  const prevWristMap = new Map();
  const wristHistory = new Map();
  let lastFaceStateGlobal = 'None'; // updated each frame and displayed in modal if available

  /* ---------------- RESIZE ---------------- */
  const PANEL_WIDTH = 340;
  function resizeCanvas(){
    const width = Math.max(320, window.innerWidth - PANEL_WIDTH);
    const height = Math.max(240, window.innerHeight);
    canvas.width = width * devicePixelRatioCached;
    canvas.height = height * devicePixelRatioCached;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(devicePixelRatioCached, 0, 0, devicePixelRatioCached, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  /* ---------------- TOAST ---------------- */
  const toastRoot = (function(){
    let r = document.getElementById('hf_toast');
    if(!r){
      r=document.createElement('div');
      r.id='hf_toast';
      r.style.position='fixed';
      r.style.right='20px';
      r.style.top='20px';
      r.style.zIndex='12000';
      r.style.display='flex';
      r.style.flexDirection='column';
      r.style.gap='8px';
      document.body.appendChild(r);
    }
    return r;
  })();
  function toast(msg, timeout = 2600){
    const it = document.createElement('div');
    it.className = 'hf-toast';
    it.textContent = msg;
    it.style.background='rgba(0,0,0,0.8)';
    it.style.color='#fff';
    it.style.padding='10px 12px';
    it.style.borderRadius='8px';
    it.style.fontFamily='Inter, sans-serif';
    toastRoot.appendChild(it);
    setTimeout(()=>{
      it.style.transition = 'opacity .35s, transform .28s';
      it.style.opacity = '0';
      it.style.transform = 'translateY(-8px)';
      setTimeout(()=>it.remove(), 350);
    }, timeout);
  }

  /* ---------------- AUDIO & SPEECH ---------------- */
  function speak(text){
    if(!speakEnabled || !('speechSynthesis' in window)) return;
    try{ window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.rate=1; window.speechSynthesis.speak(u);}catch(e){}
  }
  function playBeep(){ if(!soundEnabled) return; try{ beepAudio?.play?.catch(()=>{}); }catch(e){} }
  function playAlarm(){ if(!soundEnabled) return; try{ alarmAudio?.play?.catch(()=>{}); }catch(e){} }
  function stopAlarm(){ try{ if(alarmAudio){ alarmAudio.pause(); alarmAudio.currentTime = 0; } }catch(e){} }

  /* ---------------- lightweight effects (flashes) ---------------- */
  const flashes = [];
  function spawnFlash(x,y,amt=6){
    if(!effectsEnabled) return;
    for(let i=0;i<amt;i++) flashes.push({ x:x + (Math.random()-0.5)*12, y:y + (Math.random()-0.5)*12, life:0, max: 12 + Math.random()*14 });
  }
  function stepAndDrawFlashes(){
    for(let i=flashes.length-1;i>=0;i--){
      const f = flashes[i];
      f.life++;
      const a = 1 - (f.life / f.max);
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,200,120,${a*0.9})`;
      ctx.arc(f.x, f.y, Math.max(1, (f.max - f.life)*0.6), 0, Math.PI*2);
      ctx.fill();
      if(f.life >= f.max) flashes.splice(i,1);
    }
  }

  /* ---------------- MATH / BONE HELPERS ---------------- */
  function vec(a,b){ return {x:b.x-a.x, y:b.y-a.y}; }
  function dot(a,b){ return a.x*b.x + a.y*b.y; }
  function len(v){ return Math.hypot(v.x, v.y) || 1; }
  function angleBetween(a,b,c){
    const v1 = vec(b,a), v2 = vec(b,c);
    const d = dot(v1,v2) / (len(v1)*len(v2));
    const cos = Math.max(-1, Math.min(1, d));
    return Math.acos(cos)*180/Math.PI;
  }
 function drawFaceBones(landmarks, mirror = true, poseLandmarks = null) {
  if (!landmarks || !landmarks.length) return;

  // Quick helper to safely convert a face index to canvas coords
  const p = (idx) => {
    const lm = landmarks[idx];
    if (!lm) return null;
    return lmkToCanvas(lm, mirror);
  };

  ctx.save();
  ctx.strokeStyle = gameConfig.skeletonColor || '#ffd166';
  ctx.fillStyle = gameConfig.skeletonColor || '#ffd166';
  ctx.lineWidth = (gameConfig.boneWidth || 3);

  // --- Jawline (attempt indices 0..16 if available) ---
  try {
    const jawIndices = [];
    for (let i = 0; i <= 16; ++i) if (landmarks[i]) jawIndices.push(i);
    if (jawIndices.length) {
      ctx.beginPath();
      let first = true;
      for (const idx of jawIndices) {
        const pt = p(idx);
        if (!pt) continue;
        if (first) { ctx.moveTo(pt.x, pt.y); first = false; }
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  } catch (e) { /* harmless */ }

  // --- Nose bridge (use a small set of commonly available nose indices) ---
  try {
    const noseIdx = [168, 6, 197, 195, 5, 1].filter(i => landmarks[i]);
    if (noseIdx.length) {
      ctx.beginPath();
      let first = true;
      for (const idx of noseIdx) {
        const pt = p(idx);
        if (!pt) continue;
        if (first) { ctx.moveTo(pt.x, pt.y); first = false; }
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  } catch (e) {}

  // --- Left eye loop (attempt a common set, fall back safely) ---
  try {
    const leftEye = [33, 7, 163, 144, 145, 153, 154, 155, 133, 33].filter(i => landmarks[i]);
    if (leftEye.length) {
      ctx.beginPath();
      let first = true;
      for (const idx of leftEye) {
        const pt = p(idx);
        if (!pt) continue;
        if (first) { ctx.moveTo(pt.x, pt.y); first = false; }
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  } catch (e) {}

  // --- Right eye loop ---
  try {
    const rightEye = [263, 249, 390, 373, 374, 380, 381, 382, 362, 263].filter(i => landmarks[i]);
    if (rightEye.length) {
      ctx.beginPath();
      let first = true;
      for (const idx of rightEye) {
        const pt = p(idx);
        if (!pt) continue;
        if (first) { ctx.moveTo(pt.x, pt.y); first = false; }
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  } catch (e) {}

  // --- Mouth outline / lips ---
  try {
    const mouth = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 61].filter(i => landmarks[i]);
    if (mouth.length) {
      ctx.beginPath();
      let first = true;
      for (const idx of mouth) {
        const pt = p(idx);
        if (!pt) continue;
        if (first) { ctx.moveTo(pt.x, pt.y); first = false; }
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  } catch (e) {}

  // --- Draw small dots for a few key features for clarity ---
  const keyIndices = [1, 4, 10, 152].filter(i => landmarks[i]);
  for (const ki of keyIndices) {
    const pt = p(ki);
    if (!pt) continue;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, Math.max(1, (gameConfig.boneWidth || 3)), 0, Math.PI*2);
    ctx.fill();
  }

  // --- Neck line: connect bottom-most face point (chin) to shoulder midpoint (if pose available) ---
  try {
    // find bottom-most face canvas point
    const facePts = [];
    for (let i = 0; i < landmarks.length; i++) {
      const q = p(i);
      if (q) facePts.push(q);
    }
    if (facePts.length && poseLandmarks && poseLandmarks.length) {
      // chin as bottom-most
      let chin = facePts.reduce((a,b)=> b.y > a.y ? b : a, facePts[0]);
      // shoulders
      const leftShoulder = poseLandmarks[11] ? lmkToCanvas(poseLandmarks[11], mirror) : null;
      const rightShoulder = poseLandmarks[12] ? lmkToCanvas(poseLandmarks[12], mirror) : null;
      if (leftShoulder && rightShoulder) {
        const neckMid = { x: (leftShoulder.x + rightShoulder.x)/2, y: (leftShoulder.y + rightShoulder.y)/2 };
        ctx.beginPath();
        ctx.moveTo(chin.x, chin.y);
        ctx.lineTo(neckMid.x, neckMid.y);
        ctx.stroke();
        // little circle at neck midpoint
        ctx.beginPath();
        ctx.arc(neckMid.x, neckMid.y, Math.max(2, (gameConfig.boneWidth || 3)), 0, Math.PI*2);
        ctx.fill();
      }
    }
  } catch (e) {}

  ctx.restore();
}

  /* ---------------- HAND CLASSIFICATION ---------------- */
  function fingerExtended(landmarks, tipIdx, pipIdx, mcpIdx){
    if(!landmarks[tipIdx] || !landmarks[pipIdx] || !landmarks[mcpIdx]) return false;
    const tip = landmarks[tipIdx], pip = landmarks[pipIdx], mcp = landmarks[mcpIdx];
    const a = Math.abs(angleBetween(mcp, pip, tip));
    const dist = Math.hypot(tip.x - pip.x, tip.y - pip.y);
    return (a < 35) && (dist > 0.007);
  }
  function thumbExtended(landmarks){
    if(!landmarks[4] || !landmarks[2] || !landmarks[1]) return false;
    const cmc = landmarks[1], mcp = landmarks[2], tip = landmarks[4];
    const a = Math.abs(angleBetween(cmc, mcp, tip));
    return (a < 55) && (Math.hypot(tip.x - mcp.x, tip.y - mcp.y) > 0.015);
  }
  function pinchDistance(landmarks){ if(!landmarks[4]||!landmarks[8]) return 1; return Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y); }

  function classifyHand(landmarks){
    if(!landmarks) return 'none';
    const t = thumbExtended(landmarks);
    const i = fingerExtended(landmarks,8,6,5);
    const m = fingerExtended(landmarks,12,10,9);
    const r = fingerExtended(landmarks,16,14,13);
    const p = fingerExtended(landmarks,20,18,17);
    const extended = [t,i,m,r,p].filter(Boolean).length;
    const pinch = pinchDistance(landmarks) < CONFIG.pinchThreshold;
    if(extended >= 4) return 'open';
    if(extended === 0) return 'fist';
    if(t && i && !m && !r && !p && !pinch) return 'gun_like';
    if(i && m && !t && !r && !p) return 'peace';
    if(i && !m && !r && !p) return 'point';
    if(t && !i && !m && !r && !p) return 'thumb';
    if(pinch) return 'pinch';
    try {
      if(t && !i && !m && !r && !p){
        const wrist = landmarks[0]; const thumbTip = landmarks[4];
        if(thumbTip.y < wrist.y - 0.05) return 'thumbs_up';
      }
    } catch(e){}
    return 'partial';
  }

  /* ---------------- FACE (EAR/MAR/SMILE) ---------------- */
  const FACE_INDICES = {
    noseTip: 1,
    leftEyeTop: 159, leftEyeBottom: 145, leftEyeLeft: 33, leftEyeRight: 133,
    rightEyeTop: 386, rightEyeBottom: 374, rightEyeLeft: 362, rightEyeRight: 263,
    mouthTop: 13, mouthBottom: 14, mouthLeft: 78, mouthRight: 308
  };
  function computeEAR(landmarks, topIdx, bottomIdx, leftIdx, rightIdx){
    if(!landmarks[topIdx] || !landmarks[bottomIdx] || !landmarks[leftIdx] || !landmarks[rightIdx]) return 1;
    const v = Math.hypot(landmarks[topIdx].x - landmarks[bottomIdx].x, landmarks[topIdx].y - landmarks[bottomIdx].y);
    const h = Math.hypot(landmarks[leftIdx].x - landmarks[rightIdx].x, landmarks[leftIdx].y - landmarks[rightIdx].y);
    if(h === 0) return 1;
    return v/h;
  }
  function computeMAR(landmarks){
    if(!landmarks[FACE_INDICES.mouthTop] || !landmarks[FACE_INDICES.mouthBottom] || !landmarks[FACE_INDICES.mouthLeft] || !landmarks[FACE_INDICES.mouthRight]) return 0;
    const v = Math.hypot(landmarks[FACE_INDICES.mouthTop].x - landmarks[FACE_INDICES.mouthBottom].x, landmarks[FACE_INDICES.mouthTop].y - landmarks[FACE_INDICES.mouthBottom].y);
    const h = Math.hypot(landmarks[FACE_INDICES.mouthLeft].x - landmarks[FACE_INDICES.mouthRight].x, landmarks[FACE_INDICES.mouthLeft].y - landmarks[FACE_INDICES.mouthRight].y);
    if(h === 0) return 0;
    return v/h;
  }
  function detectSmile(landmarks){
    if(!landmarks[FACE_INDICES.mouthLeft] || !landmarks[FACE_INDICES.mouthRight] || !landmarks[FACE_INDICES.mouthTop] || !landmarks[FACE_INDICES.mouthBottom]) return false;
    const w = Math.hypot(landmarks[FACE_INDICES.mouthLeft].x - landmarks[FACE_INDICES.mouthRight].x, landmarks[FACE_INDICES.mouthLeft].y - landmarks[FACE_INDICES.mouthRight].y);
    const h = Math.hypot(landmarks[FACE_INDICES.mouthTop].x - landmarks[FACE_INDICES.mouthBottom].x, landmarks[FACE_INDICES.mouthTop].y - landmarks[FACE_INDICES.mouthBottom].y);
    if(h === 0) return false;
    const ratio = w / h;
    return ratio > 3.2;
  }

  /* ---------------- DRAW HELPERS ---------------- */
  function lmkToCanvas(lm, mirror = true) {
    const xNorm = mirror ? (1 - lm.x) : lm.x;
    const x = xNorm * (canvas.width / devicePixelRatioCached);
    const y = lm.y * (canvas.height / devicePixelRatioCached);
    return { x, y, z: lm.z ?? 0 };
  }

  function drawHand(landmarks, label, mirror=true, useThick=false){
    if(!landmarks) return;
    const skeletonColor = skeletonColorInput?.value || gameConfig.skeletonColor;
    ctx.strokeStyle = skeletonColor;
    ctx.fillStyle = skeletonColor;
    ctx.lineWidth = useThick ? (gameConfig.boneWidth + 1) : gameConfig.boneWidth;
    const connections = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [5,9],[9,10],[10,11],[11,12],
      [9,13],[13,14],[14,15],[15,16],
      [13,17],[17,18],[18,19],[19,20],[0,17]
    ];
    for(const c of connections){
      const a = landmarks[c[0]], b = landmarks[c[1]];
      if(!a||!b) continue;
      const A = lmkToCanvas(a,mirror), B = lmkToCanvas(b,mirror);
      ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke();
    }
    for(const lm of landmarks){
      const p = lmkToCanvas(lm, mirror);
      ctx.beginPath(); ctx.arc(p.x,p.y, useThick?4:3,0,Math.PI*2); ctx.fill();
    }
  }

  function drawSkeletonPose(landmarks, mirror = true, drawFilledTorso = true){
    if(!landmarks) return;
    const skeletonColor = skeletonColorInput?.value || gameConfig.skeletonColor;
    // Add leg connections:
    const pairs = [
      [11,13],[13,15],[12,14],[14,16], // arms
      [11,12],[23,24],[11,23],[12,24], // torso
      [23,25],[25,27],[27,31],         // left leg
      [24,26],[26,28],[28,32]          // right leg
    ];
    ctx.lineWidth = Math.max(1, gameConfig.boneWidth);
    ctx.strokeStyle = skeletonColor;
    for(const p of pairs){
      const a = landmarks[p[0]], b = landmarks[p[1]];
      if(!a||!b) continue;
      const A = lmkToCanvas(a,mirror), B = lmkToCanvas(b,mirror);
      ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke();
    }
    if(drawFilledTorso){
      const leftShoulder = landmarks[11], rightShoulder = landmarks[12];
      const leftHip = landmarks[23], rightHip = landmarks[24];
      if(leftShoulder && rightShoulder && leftHip && rightHip){
        const A = lmkToCanvas(leftShoulder, mirror);
        const B = lmkToCanvas(rightShoulder, mirror);
        const C = lmkToCanvas(rightHip, mirror);
        const D = lmkToCanvas(leftHip, mirror);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.lineTo(C.x, C.y);
        ctx.lineTo(D.x, D.y);
        ctx.closePath();
        ctx.fillStyle = hexToRgba(clothesColorInput?.value || gameConfig.torsoColor, 0.18);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawHeadBox(landmarks,mirror=true){
    if(!landmarks) return;
    const indices = [0,1,2,3,4,7,8];
    const pts = indices.map(i => landmarks[i]).filter(Boolean);
    if(!pts.length) return;
    const cs = pts.map(p => lmkToCanvas(p, mirror));
    const minX = Math.min(...cs.map(p => p.x));
    const maxX = Math.max(...cs.map(p => p.x));
    const minY = Math.min(...cs.map(p => p.y));
    const maxY = Math.max(...cs.map(p => p.y));
    const w = maxX + 26 - minX, h = maxY - minY;
    const cx = (minX + maxX)/2, cy = (minY + maxY)/2;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,200,80,0.95)';
    ctx.lineWidth = 2;
    ctx.ellipse(cx, cy, Math.max(30,w*0.9), Math.max(30,h*0.9), 0, 0, Math.PI*2);
    ctx.stroke();
  }

  function hexToRgba(hex, alpha=1){
    if(!hex) return `rgba(80,150,255,${alpha})`;
    const c = hex.replace('#','');
    const r = parseInt(c.substring(0,2),16);
    const g = parseInt(c.substring(2,4),16);
    const b = parseInt(c.substring(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /* ---------------- FACE FILTER DRAW (used in feed + modal preview) ---------------- */
  function drawFilters(faceLandmarks, mirror) {
    if(!faceLandmarks || !filterToggle || filterToggle.dataset.state !== 'on' ) return;
    const filter = filterSelect?.value || 'none';
    const lf = faceLandmarks;
    try{
      const leftEye = lmkToCanvas(lf[33] || lf[263] || lf[33], mirror);
      const rightEye = lmkToCanvas(lf[263] || lf[133] || lf[362], mirror);
      const nose = lmkToCanvas(lf[1] || lf[4], mirror);
      const eyeCenterX = (leftEye.x + rightEye.x)/2;
      const eyeDist = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y);
      if(filter === 'glasses') {
        ctx.save();
        ctx.translate(eyeCenterX, nose.y - eyeDist*0.2);
        ctx.scale(1,1);
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = 'rgba(20,20,30,0.9)';
        ctx.beginPath();
        const w = eyeDist * 1.6, h = eyeDist * 0.45;
        if(ctx.roundRect) ctx.roundRect(-w/2, -h/2, w, h, 8);
        else { ctx.rect(-w/2, -h/2, w, h); }
        ctx.fill();
        ctx.fillStyle = 'rgba(120,160,255,0.08)';
        ctx.beginPath();
        ctx.ellipse(-w*0.26, 0, w*0.28, h*0.7, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(w*0.26, 0, w*0.28, h*0.7, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      } else if (filter === 'hat') {
        ctx.save();
        const centerX = eyeCenterX;
        const topY = nose.y - eyeDist*1.4;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(48,60,90,0.95)';
        ctx.ellipse(centerX, topY - eyeDist*0.2, eyeDist*1.2, eyeDist*0.6, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(centerX-eyeDist*1.1, topY-eyeDist*0.05, eyeDist*2.2, eyeDist*0.2);
        ctx.restore();
      } else if (filter === 'mask') {
        ctx.save();
        const cx = eyeCenterX, cy = nose.y + eyeDist*0.35;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(20,40,80,0.92)';
        if(ctx.roundRect) ctx.roundRect(cx - eyeDist*0.9, cy - eyeDist*0.4, eyeDist*1.8, eyeDist*0.9, 10);
        else ctx.rect(cx - eyeDist*0.9, cy - eyeDist*0.4, eyeDist*1.8, eyeDist*0.9);
        ctx.fill();
        ctx.restore();
      }
    }catch(e){}
  }

  /* ---------------- CAMERA + MEDIAPIPE SETUP ---------------- */
  async function loadFaceMesh(){
    if(faceLoaded) return;
    faceMesh = new window.FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
    faceMesh.setOptions({ maxNumFaces: 2, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    faceMesh.onResults((res) => { lastFaceMulti = res.multiFaceLandmarks || []; });
    faceLoaded = true;
  }

  pose = new window.Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
  pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5 });
  pose.onResults((results)=>{
    lastPoseLandmarks = results.poseLandmarks || null;
    if(results.image){
      try{ if(window.createImageBitmap) createImageBitmap(results.image).then(img=>lastFrameImage=img); else lastFrameImage = results.image; }
      catch(e){ lastFrameImage = results.image; }
    }
  });

  hands = new window.Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
  hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
  hands.onResults((results)=>{
    const arr = [];
    const mirror = !!mirrorToggle?.checked;
    if(results.multiHandLandmarks && results.multiHandLandmarks.length){
      const handednessArr = (results.multiHandedness||[]).map(h => h.classification && h.classification[0] && h.classification[0].label ? h.classification[0].label : null);
      for(let i=0;i<results.multiHandLandmarks.length;i++){
        const lms = results.multiHandLandmarks[i];
        let label = handednessArr[i] || null;
        if(!label){
          const avgX = lms.reduce((s,p)=>s+p.x,0)/lms.length;
          label = (avgX < 0.5) ? 'Left' : 'Right';
        }
        if(mirror){ if(label==='Left') label='Right'; else if(label==='Right') label='Left'; }
        arr.push({landmarks: lms, handedness: label});
      }
    }
    lastHandsRaw = arr;
  });

  async function setupCameraAndStart(){
    const loader = document.createElement('div');
    loader.className = 'hf-loader';
    loader.textContent = 'Starting camera & models...';
    loader.style.position='fixed'; loader.style.left='50%'; loader.style.top='12%';
    loader.style.transform='translateX(-50%)'; loader.style.padding='12px 16px';
    loader.style.background='rgba(0,0,0,0.75)'; loader.style.color='#fff'; loader.style.borderRadius='8px'; loader.style.zIndex=12000;
    document.body.appendChild(loader);

    video = document.createElement('video');
    video.style.display = 'none';
    video.playsInline = true;
    video.muted = true;
    video.width = 1280; video.height = 720;
    document.body.appendChild(video);

    camera = new Camera(video, {
      onFrame: async () => {
        try { if(faceMesh) await faceMesh.send({image: video}); } catch(e){}
        try { await pose.send({image: video}); } catch(e){}
        try { await hands.send({image: video}); } catch(e){}
      },
      width: 1280, height: 720
    });
    await camera.start();
    loader.remove();
  }

  /* ---------------- GAME SYSTEM ---------------- */
  const GameMode = { NONE: 0, LASER: 1, HITBALL: 2 };
  let activeGame = GameMode.NONE;

  // Laser game
  let enemies = [];
  let laserScore = 0;
  let enemySpawnTimer = null;

  function spawnEnemy(typeOverride=null){
    const w = canvas.width/devicePixelRatioCached;
    const size = 18 + Math.random()*28;
    const x = Math.random() * (w - 60) + 30;
    const speed = CONFIG.enemySpeedMin + Math.random()*(CONFIG.enemySpeedMax - CONFIG.enemySpeedMin);
    const type = typeOverride || gameConfig.enemyType || 'ball';
    enemies.push({x, y:-size, r:size, speed, hp: Math.max(1, Math.round(size/18)), type});
  }

  function stepEnemies(dt){
    for(let i=enemies.length-1;i>=0;i--){
      const e = enemies[i];
      e.y += e.speed * (dt/1000);
      if(e.y - e.r > canvas.height/devicePixelRatioCached + 100){
        enemies.splice(i,1);
        player.health = Math.max(0, player.health - 6);
        spawnFlash(e.x, e.y, 6);
        playDamageSound();
      }
    }
  }

  function drawEnemies(){
    for(const e of enemies){
      ctx.beginPath();
      if(e.type==='ball'){
        ctx.fillStyle = 'rgba(220,60,60,0.96)';
        ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,20,20,0.9)';
        ctx.lineWidth = 2; ctx.stroke();
      } else if(e.type==='square'){
        ctx.fillStyle = 'rgba(200,120,50,0.96)';
        ctx.beginPath(); ctx.rect(e.x - e.r, e.y - e.r, e.r*2, e.r*2); ctx.fill();
        ctx.strokeStyle = 'rgba(120,70,20,0.9)'; ctx.lineWidth = 2; ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(120,200,220,0.96)';
        ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r*1.3, e.r*0.7, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(60,90,100,0.9)'; ctx.lineWidth = 2; ctx.stroke();
      }
    }
  }

  // Hit-Ball game
  let hitBalls = [];
  let hitScore = 0;
  function spawnHitBall(){
    const w = canvas.width/devicePixelRatioCached, h = canvas.height/devicePixelRatioCached;
    const r = 20 + Math.random()*26;
    const side = Math.random();
    let x,y,vx,vy;
    if(side < 0.4){ x = Math.random() * (w - 2*r) + r; y = -r; vx = (Math.random()-0.5)*200; vy = 150 + Math.random()*160; }
    else if(side < 0.7){ x = -r; y = Math.random()*(h-2*r)+r; vx = 200 + Math.random()*200; vy = (Math.random()-0.5)*80; }
    else { x = w + r; y = Math.random()*(h-2*r)+r; vx = -200 - Math.random()*200; vy = (Math.random()-0.5)*80; }
    hitBalls.push({x,y,r,vx,vy,life:0});
  }
  function stepHitBalls(dt){
    const w = canvas.width/devicePixelRatioCached, h = canvas.height/devicePixelRatioCached;
    for(let i=hitBalls.length-1;i>=0;i--){
      const b = hitBalls[i];
      b.vy += CONFIG.ballGravity * (dt/1000) * 0.2;
      b.x += b.vx * (dt/1000);
      b.y += b.vy * (dt/1000);
      b.life += dt;
      if(b.x < -200 || b.x > w + 200 || b.y > h + 200) hitBalls.splice(i,1);
    }
  }
  function drawHitBalls(){
    for(const b of hitBalls){
      ctx.beginPath();
      ctx.fillStyle = 'rgba(50,160,255,0.95)';
      ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,90,140,0.9)';
      ctx.lineWidth = 3; ctx.stroke();
    }
  }

  /* ---------------- LASER: compute aim & hits ---------------- */
  function computeIndexAim(landmarks, mirror){
    if(!landmarks) return null;
    const tip = landmarks[8], pip = landmarks[6], mcp = landmarks[5];
    let originCanvas = lmkToCanvas(tip, mirror);
    let dir = {x:0, y:-1};
    try {
      if(pip && mcp){
        const pPip = lmkToCanvas(pip, mirror), pMcp = lmkToCanvas(mcp, mirror);
        dir = {x: originCanvas.x - pPip.x, y: originCanvas.y - pPip.y};
        const l = Math.hypot(dir.x, dir.y) || 1;
        dir.x /= l; dir.y /= l;
      } else {
        const wrist = lmkToCanvas(landmarks[0], mirror);
        dir = {x: originCanvas.x - wrist.x, y: originCanvas.y - wrist.y};
        const l = Math.hypot(dir.x, dir.y) || 1;
        dir.x /= l; dir.y /= l;
      }
    } catch(e){}
    const forwardOffset = 8;
    originCanvas.x += dir.x * forwardOffset;
    originCanvas.y += dir.y * forwardOffset;
    return { origin: originCanvas, dir };
  }

  // helper to produce rgba with alpha from rgba string or hex
  function rgbaWithAlpha(color, alpha){
    if(!color) return `rgba(255,120,40,${alpha})`;
    if(color.startsWith('rgba')) {
      const parts = color.replace('rgba(','').replace(')','').split(',');
      return `rgba(${parts[0].trim()},${parts[1].trim()},${parts[2].trim()},${alpha})`;
    }
    if(color.startsWith('rgb(')) {
      const parts = color.replace('rgb(','').replace(')','').split(',');
      return `rgba(${parts[0].trim()},${parts[1].trim()},${parts[2].trim()},${alpha})`;
    }
    // hex
    const c = color.replace('#','');
    const r = parseInt(c.substring(0,2),16);
    const g = parseInt(c.substring(2,4),16);
    const b = parseInt(c.substring(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function applyLaserHits(origin, dir){
    // enemies first
    for(let i=enemies.length-1;i>=0;i--){
      const e = enemies[i];
      const vx = e.x - origin.x, vy = e.y - origin.y;
      const proj = vx * dir.x + vy * dir.y;
      if(proj < 0) continue;
      if(proj > CONFIG.laserLength) continue;
      const closestX = origin.x + dir.x * proj;
      const closestY = origin.y + dir.y * proj;
      const d = Math.hypot(closestX - e.x, closestY - e.y);
      if(d < e.r + (CONFIG.laserWidth*0.8)){
        e.hp -= CONFIG.laserDamagePerHit;
        spawnFlash(e.x, e.y, 8);
        playHitSound();
        if(e.hp <= 0){
          enemies.splice(i,1);
          laserScore++;
        }
      }
    }
    // also check hitBalls (Hit-Ball game) and destroy if intersected
    for(let i=hitBalls.length-1;i>=0;i--){
      const b = hitBalls[i];
      const vx = b.x - origin.x, vy = b.y - origin.y;
      const proj = vx * dir.x + vy * dir.y;
      if(proj < 0) continue;
      if(proj > CONFIG.laserLength) continue;
      const closestX = origin.x + dir.x * proj;
      const closestY = origin.y + dir.y * proj;
      const d = Math.hypot(closestX - b.x, closestY - b.y);
      if(d < b.r + (CONFIG.laserWidth*0.8)){
        spawnFlash(b.x, b.y, 10);
        playHitSound();
        hitBalls.splice(i,1);
        hitScore += CONFIG.hitBallScore;
      }
    }
  }

  // draw a visually thin realistic laser: narrow core + thin outer glows
  function drawLaserBeamVisual(origin, dir, colorOverride){
    const colorMain = colorOverride || gameConfig.laserColor || 'rgba(255,120,40,1)';
    const coreWidth = Math.max(2, (gameConfig.laserWidth || CONFIG.laserWidth));
    const glowWidth = coreWidth * 5;
    const x2 = origin.x + dir.x * CONFIG.laserLength;
    const y2 = origin.y + dir.y * CONFIG.laserLength;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // outer soft glow
    ctx.beginPath();
    ctx.strokeStyle = rgbaWithAlpha(colorMain, 0.08);
    ctx.lineWidth = glowWidth;
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // secondary glow
    ctx.beginPath();
    ctx.strokeStyle = rgbaWithAlpha(colorMain, 0.18);
    ctx.lineWidth = coreWidth*2;
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // core
    ctx.beginPath();
    ctx.strokeStyle = rgbaWithAlpha(colorMain, 1);
    ctx.lineWidth = coreWidth;
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // muzzle flash
    ctx.beginPath();
    ctx.fillStyle = rgbaWithAlpha(colorMain, 1);
    ctx.arc(origin.x, origin.y, coreWidth*1.6, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  /* ---------------- AUDIO SFX ---------------- */
  function playHitSound(){ try{ const ac=new (window.AudioContext||window.webkitAudioContext)(); const o=ac.createOscillator(), g=ac.createGain(); o.type='sine'; o.frequency.setValueAtTime(420,ac.currentTime); g.gain.setValueAtTime(0.0001,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.22,ac.currentTime+0.01); g.gain.exponentialRampToValueAtTime(0.00001,ac.currentTime+0.12); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+0.12);}catch(e){} }
  function playDamageSound(){ try{ const ac = new (window.AudioContext||window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(120,ac.currentTime); g.gain.setValueAtTime(0.0001,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.25,ac.currentTime+0.01); g.gain.exponentialRampToValueAtTime(0.00001,ac.currentTime+0.25); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+0.25);}catch(e){} }
  function playKickSound(){ try{ const ac=new (window.AudioContext||window.webkitAudioContext)(); const o=ac.createOscillator(), g=ac.createGain(); o.type='triangle'; o.frequency.setValueAtTime(280,ac.currentTime); g.gain.setValueAtTime(0.0001,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.3,ac.currentTime+0.01); g.gain.exponentialRampToValueAtTime(0.00001,ac.currentTime+0.18); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+0.18);}catch(e){} }

  /* ---------------- GESTURE HELPERS ---------------- */
  function detectWaveFromHistory(hist){
    if(!hist || hist.length < 6) return false;
    let signChanges = 0;
    for(let i=2;i<hist.length;i++){
      const dx1 = hist[i-1].x - hist[i-2].x;
      const dx2 = hist[i].x - hist[i-1].x;
      if((dx1>0 && dx2<0) || (dx1<0 && dx2>0)) signChanges++;
    }
    const xs = hist.map(p=>p.x);
    const amp = Math.max(...xs) - Math.min(...xs);
    return signChanges >= CONFIG.waveSignChanges && amp > CONFIG.waveAmplitudePx;
  }
  function detectPunchFromVel(vx, vy, prevSpeed, threshold = CONFIG.punchSpeedThreshold){
    const speed = Math.hypot(vx, vy);
    if(speed > threshold && prevSpeed < (threshold*0.6)) return true;
    return false;
  }
  function detectFightStance(poseLandmarks, handsArr, sensitivity=0.7){
    if(!poseLandmarks || !handsArr) return false;
    const leftShoulder = poseLandmarks[11], rightShoulder = poseLandmarks[12];
    const leftWrist = poseLandmarks[15], rightWrist = poseLandmarks[16];
    if(!leftShoulder || !rightShoulder || (!leftWrist && !rightWrist)) return false;
    const sAvgY = (leftShoulder.y + rightShoulder.y)/2;
    const wristsY = [];
    if(leftWrist) wristsY.push(leftWrist.y);
    if(rightWrist) wristsY.push(rightWrist.y);
    const wristsAbove = wristsY.filter(y => y < sAvgY - (0.06*sensitivity)).length;
    const nose = poseLandmarks[0];
    let nearFace = 0;
    if(nose){
      for(const h of handsArr){
        const wrist = h.landmarks[0];
        if(!wrist) continue;
        const d = Math.abs(wrist.y - nose.y);
        if(d < 0.20*sensitivity) nearFace++;
      }
    }
    return (wristsAbove >= 1 && nearFace >= 1);
  }
  function detectGunInHands(handsArr, sensitivity=0.7){
    if(!handsArr || !handsArr.length) return false;
    for(const h of handsArr){
      const cls = classifyHand(h.landmarks);
      if(cls !== 'gun_like' && cls !== 'point') continue;
      const d = Math.hypot(h.landmarks[4].x - h.landmarks[8].x, h.landmarks[4].y - h.landmarks[8].y);
      const zForward = (h.landmarks[8].z && h.landmarks[4].z) ? ((h.landmarks[4].z + h.landmarks[8].z)/2) < -0.05 : false;
      if(d < 0.25*(1/sensitivity) || zForward) return true;
    }
    return false;
  }

  /* ---------------- PLAYER ---------------- */
  let player = { health: 100, alive: true };

  /* ---------------- MAIN LOOP ---------------- */
  let lastProcessTime = performance.now();
  let currentHandsGlobal = [];

  /* ---------------- MODAL LASER CURSOR INTERACTION ---------------- */
  function laserModalInteraction(handsArr){
    const modal = document.querySelector('.hf-modal.show');
    if(!modal) return;
    const cards = Array.from(modal.querySelectorAll('.selectable-card'));
    if(cards.length === 0) return;
    const h = handsArr[0];
    if(!h) return;
    const aim = computeIndexAim(h.landmarks, !!mirrorToggle?.checked);
    if(!aim) return;
    const origin = aim.origin, dir = aim.dir;
    const beamLen = 2000;
    const x2 = origin.x + dir.x * beamLen, y2 = origin.y + dir.y * beamLen;
    const beamLine = {x1: origin.x, y1: origin.y, x2, y2};
    for(const c of cards){
      const rect = c.getBoundingClientRect();
      const left = rect.left - canvas.getBoundingClientRect().left;
      const top = rect.top - canvas.getBoundingClientRect().top;
      const right = left + rect.width;
      const bottom = top + rect.height;
      const hit = rayIntersectsAABB(beamLine, {left, top, right, bottom});
      if(hit){
        c.classList.add('hf-hover');
        if(!c._hoverStart) c._hoverStart = performance.now();
        const elapsed = performance.now() - c._hoverStart;
        // visual progress (optional): fill width
        if(elapsed > CONFIG.modalHoverMs){
          c.click();
          c._hoverStart = null;
        }
      } else {
        c.classList.remove('hf-hover');
        c._hoverStart = null;
      }
    }
    // draw cursor short beam for feedback in modal
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.beginPath(); ctx.strokeStyle=rgbaWithAlpha(gameConfig.laserColor,0.95); ctx.lineWidth = Math.max(2, (gameConfig.laserWidth||CONFIG.laserWidth));
    ctx.moveTo(origin.x, origin.y); ctx.lineTo(origin.x + dir.x*200, origin.y + dir.y*200); ctx.stroke();
    ctx.restore();
  }

  function rayIntersectsAABB(line, rect){
    return segmentIntersectsRect(line.x1,line.y1,line.x2,line.y2,rect.left,rect.top,rect.right,rect.bottom);
  }
  function segmentIntersectsRect(x1,y1,x2,y2,left,top,right,bottom){
    if(lineIntersectsLine(x1,y1,x2,y2,left,top,right,top)) return true;
    if(lineIntersectsLine(x1,y1,x2,y2,right,top,right,bottom)) return true;
    if(lineIntersectsLine(x1,y1,x2,y2,left,bottom,right,bottom)) return true;
    if(lineIntersectsLine(x1,y1,x2,y2,left,top,left,bottom)) return true;
    return false;
  }
  function lineIntersectsLine(x1,y1,x2,y2,x3,y3,x4,y4){
    const denom = (y4 - y3)*(x2 - x1) - (x4 - x3)*(y2 - y1);
    if(denom === 0) return false;
    const ua = ((x4 - x3)*(y1 - y3) - (y4 - y3)*(x1 - x3)) / denom;
    const ub = ((x2 - x1)*(y1 - y3) - (y2 - y1)*(x1 - x3)) / denom;
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  /* ---------------- ANIMATE ---------------- */
  function animate(){
    if(!running) return;
    requestAnimationFrame(animate);

    if(lastFrameImage){
      ctx.drawImage(lastFrameImage, 0, 0, canvas.width/devicePixelRatioCached, canvas.height/devicePixelRatioCached);
    } else {
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width/devicePixelRatioCached, canvas.height/devicePixelRatioCached);
    }

    const mirror = !!mirrorToggle?.checked;
    const now = performance.now();
    const dt = Math.max(1, now - lastProcessTime);
    lastProcessTime = now;

    const handsArr = [];
    if(lastHandsRaw && lastHandsRaw.length){
      for(const h of lastHandsRaw){
        const lms = h.landmarks;
        const wristLm = lms[0];
        const wristCanvas = lmkToCanvas(wristLm, mirror);
        const key = h.handedness;
        const prev = prevWristMap.get(key) || null;
        const vel = prev ? computeWristVel(prev, wristCanvas, dt) : 0;
        const vx = prev ? (wristCanvas.x - prev.x)/(dt/1000) : 0;
        const vy = prev ? (wristCanvas.y - prev.y)/(dt/1000) : 0;
        prevWristMap.set(key, wristCanvas);
        const hk = `${h.handedness}:${Math.round(wristCanvas.x/40)}:${Math.round(wristCanvas.y/40)}`;
        const hist = wristHistory.get(hk) || [];
        hist.push({x:wristCanvas.x, y:wristCanvas.y, t:Date.now()});
        if(hist.length > CONFIG.historyMax) hist.shift();
        wristHistory.set(hk, hist);
        handsArr.push({landmarks: lms, handedness: h.handedness, wristCanvas, wristVel: vel, vx, vy, histKey: hk});
      }
    }
    if (laserState.running && laserState.enabled && handsArr.length) {
    for (const h of handsArr) {
      // Use the wrist as the laser origin and palm direction for the laser
      const wrist = lmkToCanvas(h.landmarks[0], mirror); // wrist
      const palm = lmkToCanvas(h.landmarks[9], mirror);  // palm center (landmark 9 is palm base)
      // Calculate direction vector from wrist to palm center
      const dx = palm.x - wrist.x;
      const dy = palm.y - wrist.y;
      const mag = Math.sqrt(dx*dx + dy*dy) || 1;
      const dir = { x: dx / mag, y: dy / mag };

      // Draw the laser beam always, from wrist in palm direction
      drawLaserBeamVisual(wrist, dir);

      // Apply laser hits/interactions if needed
      applyLaserHits(wrist, dir);
    }
}
    currentHandsGlobal = handsArr;

    const poseLandmarks = lastPoseLandmarks || null;

    if(bodyMode && poseLandmarks){
      drawSkeletonPose(poseLandmarks, mirror, true);
      drawHeadBox(poseLandmarks, mirror);
      bodyDetectedEl.textContent = 'Yes';
      for(const h of handsArr) drawHand(h.landmarks, h.handedness, mirror, true);
    } else bodyDetectedEl.textContent = 'No';

    // Face gestures
    let faceStateStr = 'None';
      if(lastFaceMulti && lastFaceMulti.length && faceMesh){
        for (const face of lastFaceMulti) {
          const lm = face.scaledMesh || face.landmarks;
          if (!lm || !lm.length) continue;
          // Draw debug points
          ctx.save();
          ctx.fillStyle = '#0f0';
          for (let i = 0; i < Math.min(lm.length, 478); ++i) {
            const p = lmkToCanvas(lm[i], mirror);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
            ctx.fill();
          }
          ctx.restore();
          // Draw bones
          drawFaceBones(lm, mirror, lastPoseLandmarks);
        }
      
      const primary = lastFaceMulti[0];
      if(primary){
        const earL = computeEAR(primary, FACE_INDICES.leftEyeTop, FACE_INDICES.leftEyeBottom, FACE_INDICES.leftEyeLeft, FACE_INDICES.leftEyeRight);
        const earR = computeEAR(primary, FACE_INDICES.rightEyeTop, FACE_INDICES.rightEyeBottom, FACE_INDICES.rightEyeLeft, FACE_INDICES.rightEyeRight);
        const mar = computeMAR(primary);
        const faceFlags = [];
        if(earL < CONFIG.blinkThreshold && earR < CONFIG.blinkThreshold) faceFlags.push('blink');
        else {
          if(earL < CONFIG.blinkThreshold) faceFlags.push('left wink');
          if(earR < CONFIG.blinkThreshold) faceFlags.push('right wink');
        }
        if(mar > CONFIG.mouthOpenThreshold) faceFlags.push('mouth open');
        if(mar > CONFIG.laughMAR) faceFlags.push('possible laugh');
        if(detectSmile(primary)) faceFlags.push('smile');
        if(faceFlags.length) faceStateStr = faceFlags.join(', ');
        // draw filters anchored to face
        drawFilters(primary, mirror);
      }
    }
    lastFaceStateGlobal = faceStateStr;
    // update face expression in games modal if present
    const faceExprEl = document.getElementById('hf_face_expr');
    if(faceExprEl) faceExprEl.textContent = lastFaceStateGlobal;

    // Process hands for gestures and game interactions
    if(handsArr.length){
      for(const h of handsArr){
        if(!bodyMode) drawHand(h.landmarks, h.handedness, mirror);
        const gesture = classifyHand(h.landmarks);
        const hist = wristHistory.get(h.histKey) || [];
        let action = null;
        if(detectWaveFromHistory(hist)) action = 'wave';
        const prevEntry = hist.length >= 2 ? hist[hist.length - 2] : null;
        const prevSpeed = prevEntry ? Math.hypot((hist[hist.length-1].x - prevEntry.x)/((hist[hist.length-1].t - prevEntry.t)/1000 || 1), (hist[hist.length-1].y - prevEntry.y)/((hist[hist.length-1].t - prevEntry.t)/1000 || 1)) : 0;
        if(detectPunchFromVel(h.vx, h.vy, prevSpeed, Number(motionThreshold?.value || 600) * 1.6)) action = 'punch';
        const speed = Math.hypot(h.vx||0, h.vy||0);
        if(!action && speed > (Number(motionThreshold?.value || 600) * CONFIG.swipeSpeedMultiplier)) action = 'fast_move';

        const w = h.wristCanvas;
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillText(`${h.handedness}`, w.x + 8, w.y + 6);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(`G:${gesture}`, w.x + 8, w.y + 22);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(`${Math.round(h.wristVel)} px/s`, w.x + 8, w.y + 36);
        if(action){ ctx.fillStyle = 'rgba(255,180,60,0.95)'; ctx.fillText(`Action:${action}`, w.x + 8, w.y + 52); }

        // Laser game: attach to index when index extended (thumb may be ignored)
        if(activeGame === GameMode.LASER){
          const aim = computeIndexAim(h.landmarks, mirror);
          if(aim){
            const idxExt = fingerExtended(h.landmarks,8,6,5);
            const midExt = fingerExtended(h.landmarks,12,10,9);
            const ringExt = fingerExtended(h.landmarks,16,14,13);
            const pinkyExt = fingerExtended(h.landmarks,20,18,17);
            if(idxExt && !midExt && !ringExt && !pinkyExt){
              const color = gameConfig.laserColor || 'rgba(255,80,40,1)';
              gameConfig.laserWidth = Number(gameConfig.laserWidth) || CONFIG.laserWidth;
              drawLaserBeamVisual(aim.origin, aim.dir, color);
              applyLaserHits(aim.origin, aim.dir);
            }
          }
        }

        // Hit-Ball game: open palm to hit
        if(activeGame === GameMode.HITBALL){
          const gestureNow = classifyHand(h.landmarks);
          if(gestureNow === 'open'){
            const palmLm = h.landmarks[9] || h.landmarks[0];
            const palmCanvas = lmkToCanvas(palmLm, mirror);
            for(let i=hitBalls.length-1;i>=0;i--){
              const b = hitBalls[i];
              const d = Math.hypot(b.x - palmCanvas.x, b.y - palmCanvas.y);
              if(d < b.r + 60){
                hitScore += CONFIG.hitBallScore;
                spawnFlash(b.x, b.y, 8);
                playHitSound();
                hitBalls.splice(i,1);
              }
            }
          }
        }

      } // end hands loop

      laserModalInteraction(handsArr);
      handsCountEl.textContent = handsArr.length;
      gestureLabelEl.textContent = classifyHand(handsArr[0].landmarks);
    } else {
      handsCountEl.textContent = 0;
      gestureLabelEl.textContent = 'no_hands';
    }

    // Alerts
    const sensitivity = Number(alertSensitivity?.value) || 0.7;
    let alertTriggered = false;
    let alertText = 'None';
    if(bodyMode && poseLandmarks){
      if(detectFightStance(poseLandmarks, handsArr, sensitivity)){
        alertTriggered = true; alertText = 'Fight stance detected';
      }
    }
    if(!alertTriggered && detectGunInHands(handsArr, sensitivity)){
      alertTriggered = true; alertText = 'Gun-like pose detected';
    }
    if(lastFaceMulti && lastFaceMulti.length > 1){
      alertTriggered = true;
      alertText = alertText === 'None' ? `Other person detected (${lastFaceMulti.length})` : alertText + `; other person detected`;
    }
    if(alertTriggered){
      alertStateEl.textContent = alertText;
      ctx.fillStyle = 'rgba(255,40,40,0.12)';
      ctx.fillRect(0,0,canvas.width/devicePixelRatioCached, canvas.height/devicePixelRatioCached);
      playAlarm(); speak(alertText);
    } else {
      alertStateEl.textContent = 'None';
      try{ if(alarmAudio){ alarmAudio.pause(); alarmAudio.currentTime = 0; } } catch(e){}
    }

    // Game updates
    if(activeGame === GameMode.LASER){
      stepEnemies(dt);
      drawEnemies();
    }
    if(activeGame === GameMode.HITBALL){
      stepHitBalls(dt);
      drawHitBalls();
    }

    // HUD
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(10,10,340,120);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText(`Mode: ${activeGame === GameMode.LASER ? 'Laser' : (activeGame === GameMode.HITBALL ? 'Hit-Ball' : 'None')}`, 20, 32);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`Laser Score: ${laserScore}`, 20, 52);
    ctx.fillText(`Hit Score: ${hitScore}`, 20, 70);
    ctx.fillText(`Enemies: ${enemies.length}`, 20, 88);
    ctx.fillText(`Health: ${player.health}`, 20, 106);
    ctx.restore();

    stepAndDrawFlashes();

    const nowF = performance.now();
    const fps = Math.round(1000 / Math.max(1, (nowF - now)));
    fpsEl.textContent = fps;

    if(player.health <= 0 && player.alive){
      player.alive = false; toast('Player down', 3000);
    }
  } // end animate

  /* ---------------- UTIL ---------------- */
  function computeWristVel(prev, curr, dtMs){
    if(!prev || !curr || dtMs <= 0) return 0;
    const dx = (curr.x - prev.x), dy = (curr.y - prev.y);
    const dist = Math.hypot(dx,dy);
    return (dist / (dtMs/1000));
  }

  /* ---------------- DOM EVENTS ---------------- */
  canvas.addEventListener('click', (ev)=>{
    if(!clickEmit?.checked) return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    spawnFlash(x,y,12);
  });

  startBtn?.addEventListener('click', async ()=>{
    if(running) return;
    running = true; if(startBtn) startBtn.disabled = true; if(stopBtn) stopBtn.disabled = false;
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: Number(handsComplexity?.value) || 1,
      minDetectionConfidence: Number(minDetection?.value) || 0.5,
      minTrackingConfidence: Number(minDetection?.value) || 0.5
    });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: Number(minDetection?.value) || 0.5 });
    try { await loadFaceMesh(); } catch(e){ console.warn('FaceMesh load failed — face features disabled.'); }
    await setupCameraAndStart();
    requestAnimationFrame(animate);
    toast('Started');
  });

  stopBtn?.addEventListener('click', ()=>{
    running = false; if(startBtn) startBtn.disabled = false; if(stopBtn) stopBtn.disabled = true;
    try{ camera && camera.stop(); } catch(e){}
    try{ video && video.remove(); } catch(e){}
    lastFrameImage = null; lastHandsRaw = []; lastPoseLandmarks = null; lastFaceMulti = [];
    wristHistory.clear(); prevWristMap.clear();
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width/devicePixelRatioCached, canvas.height/devicePixelRatioCached);
    try{ alarmAudio && alarmAudio.pause(); alarmAudio && (alarmAudio.currentTime = 0); } catch(e){}
    toast('Stopped');
  });

  bodyModeBtn?.addEventListener('click', ()=>{
    bodyMode = !bodyMode;
    bodyModeBtn.textContent = bodyMode ? 'Disable Body Mode' : 'Enable Body Mode';
    bodyDetectedEl.textContent = bodyMode ? 'Pending...' : 'No';
  });

  particleModeBtn?.addEventListener('click', ()=>{
    effectsEnabled = !effectsEnabled;
    particleModeBtn.textContent = effectsEnabled ? 'Effects: On' : 'Effects: Off';
  });

  toggleSound?.addEventListener('click', ()=>{
    soundEnabled = !soundEnabled;
    toggleSound.textContent = soundEnabled ? 'Sound: On' : 'Sound: Off';
    if(!soundEnabled) try{ alarmAudio && alarmAudio.pause(); alarmAudio.currentTime = 0; } catch(e){}
  });
  toggleSpeak?.addEventListener('click', ()=>{
    speakEnabled = !speakEnabled;
    toggleSpeak.textContent = speakEnabled ? 'Speech: On' : 'Speech: Off';
  });

  handsComplexity?.addEventListener('change', ()=>{ hands && hands.setOptions({ modelComplexity: Number(handsComplexity.value) || 1 }); });
  minDetection?.addEventListener('change', ()=>{
    const v = Number(minDetection.value) || 0.5;
    if(hands) hands.setOptions({ minDetectionConfidence: v, minTrackingConfidence: v });
    if(pose) pose.setOptions({ minDetectionConfidence: v });
    if(faceMesh) faceMesh.setOptions({ minDetectionConfidence: v, minTrackingConfidence: v });
  });

  filterToggle?.addEventListener('click', ()=>{
    const on = filterToggle.dataset.state !== 'on';
    filterToggle.dataset.state = on ? 'on' : 'off';
    filterToggle.textContent = on ? 'Filter: On' : 'Filter: Off';
    toast(`Face filter ${on ? 'enabled' : 'disabled'}`, 1200);
  });

  /* ---------------- MODALS & CONFIG UI ---------------- */
  function createModal(contentHtml){
    const existing = document.querySelector('.hf-modal');
    if(existing) existing.remove();
    const modal = document.createElement('div');
    modal.className = 'hf-modal';
    modal.style.position='fixed';
    modal.style.left='0'; modal.style.top='0'; modal.style.right='0'; modal.style.bottom='0';
    modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center';
    modal.style.background='rgba(0,0,0,0.6)'; modal.style.zIndex = 12000;
    modal.innerHTML = `<div class="hf-panel" style="min-width:560px;max-width:94%;background:#121217;padding:18px;border-radius:12px;color:#fff;font-family:Inter, sans-serif;transform:translateY(-12px);opacity:0;transition:all .22s">${contentHtml}</div>`;
    document.body.appendChild(modal);
    setTimeout(()=>{ const p = modal.querySelector('.hf-panel'); p.style.transform='translateY(0)'; p.style.opacity='1'; modal.classList.add('show'); }, 20);
    return modal;
  }

  let gamesModal = null;
  openGamesModalBtn?.addEventListener('click', openGamesModal);
  function openGamesModal(){
    if(gamesModal){ gamesModal.classList.add('show'); return; }

    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0">Games & Config</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <div style="font-size:12px;color:#bbb;margin-right:10px">Face Expr: <span id="hf_face_expr">None</span></div>
          <button id="hf_games_close" class="btn">Close</button>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:300px">
          <div style="font-weight:600;margin-bottom:6px">Laser Game</div>
          <div style="margin-bottom:8px">Use your index finger to fire the laser. Laser is persistent even when this modal is closed.</div>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <button id="hf_laser_start" class="btn primary">Start Laser</button>
            <button id="hf_laser_stop" class="btn">Stop Laser</button>
            <button id="hf_laser_reset" class="btn">Reset Score</button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <div style="min-width:180px">
              <div style="font-weight:600;margin-bottom:6px">Choose Enemy</div>
              <div style="display:flex;gap:8px">
                <div class="selectable-card" data-enemy="ball" style="padding:8px;border-radius:8px;background:#0f1724;border:2px solid ${gameConfig.enemyType==='ball' ? hexToRgba('#00e5a8',0.9) : 'rgba(255,255,255,0.04)'};cursor:pointer">
                  <div style="font-weight:600">Ball</div><div style="font-size:12px;color:#ccc">Round</div>
                </div>
                <div class="selectable-card" data-enemy="square" style="padding:8px;border-radius:8px;background:#0f1724;border:2px solid ${gameConfig.enemyType==='square' ? hexToRgba('#00e5a8',0.9) : 'rgba(255,255,255,0.04)'};cursor:pointer">
                  <div style="font-weight:600">Square</div><div style="font-size:12px;color:#ccc">Block</div>
                </div>
                <div class="selectable-card" data-enemy="drone" style="padding:8px;border-radius:8px;background:#0f1724;border:2px solid ${gameConfig.enemyType==='drone' ? hexToRgba('#00e5a8',0.9) : 'rgba(255,255,255,0.04)'};cursor:pointer">
                  <div style="font-weight:600">Drone</div><div style="font-size:12px;color:#ccc">Fast</div>
                </div>
              </div>
            </div>

            <div style="min-width:180px">
              <div style="font-weight:600;margin-bottom:6px">Laser Color</div>
              <div style="display:flex;gap:8px">
                <div class="selectable-card" data-lcolor="rgba(255,80,40,1)" style="padding:8px;border-radius:8px;background:#0f1724;border:2px solid ${gameConfig.laserColor==='rgba(255,80,40,1)' ? hexToRgba('#00e5a8',0.9) : 'rgba(255,255,255,0.04)'};cursor:pointer">
                  <div style="font-weight:600">Orange</div>
                </div>
                <div class="selectable-card" data-lcolor="rgba(80,200,255,1)" style="padding:8px;border-radius:8px;background:#0f1724;border:2px solid ${gameConfig.laserColor==='rgba(80,200,255,1)' ? hexToRgba('#00e5a8',0.9) : 'rgba(255,255,255,0.04)'};cursor:pointer">
                  <div style="font-weight:600">Cyan</div>
                </div>
                <div class="selectable-card" data-lcolor="rgba(180,80,255,1)" style="padding:8px;border-radius:8px;background:#0f1724;border:2px solid ${gameConfig.laserColor==='rgba(180,80,255,1)' ? hexToRgba('#00e5a8',0.9) : 'rgba(255,255,255,0.04)'};cursor:pointer">
                  <div style="font-weight:600">Magenta</div>
                </div>
              </div>
            </div>

            <div style="min-width:180px">
              <div style="font-weight:600;margin-bottom:6px">Laser Width</div>
              <input id="calibr_lwidth" type="range" min="2" max="24" step="1" value="${gameConfig.laserWidth || CONFIG.laserWidth}">
            </div>
          </div>
        </div>

        <div style="width:320px">
          <div style="font-weight:600;margin-bottom:6px">Hit-The-Ball Game</div>
          <div style="margin-bottom:8px">Balls will spawn from screen edges; open palms to hit them.</div>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <button id="hf_hit_start" class="btn primary">Start Hit-Ball</button>
            <button id="hf_hit_stop" class="btn">Stop Hit-Ball</button>
            <button id="hf_hit_reset" class="btn">Reset Score</button>
          </div>

          <div style="margin-top:6px;font-weight:600">Appearance</div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
            <label style="display:flex;flex-direction:column;font-size:12px;color:#ccc">Skeleton Color
              <input id="modal_skeleton_color" type="color" value="${gameConfig.skeletonColor}" style="margin-top:6px"/>
            </label>
            <label style="display:flex;flex-direction:column;font-size:12px;color:#ccc">Torso Color
              <input id="modal_torso_color" type="color" value="${gameConfig.torsoColor}" style="margin-top:6px"/>
            </label>
            <div style="margin-top:8px">
            <div style="font-weight:600;margin-bottom:6px">Advanced / Config</div>
            <label style="display:block;margin-top:6px;font-size:13px;color:#ccc">
              Bone Width
              <input id="modal_bone_width" type="range" min="1" max="12" step="1" value="${gameConfig.boneWidth || 3}" style="width:100%;margin-top:6px"/>
            </label>

            <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
              <button id="modal_show_config" class="btn">Show Current Config</button>
              <button id="modal_copy_config" class="btn">Copy Config</button>
            </div>
            <pre id="modal_config_view" style="display:none;white-space:pre-wrap;background:#0b0c0f;padding:8px;border-radius:8px;margin-top:8px;color:#9be7c4;"></pre>
          </div>

          </div>
          <div style="margin-top:10px;font-size:12px;color:#aaa">Face expressions appear live above.</div>
        </div>
      </div>
    `;

    gamesModal = createModal(html);

    // persist selections into gameConfig
    gamesModal._selectedEnemyType = gameConfig.enemyType;
    gamesModal._selectedLaserColor = gameConfig.laserColor;

    // register selectable card behavior
    const cards = gamesModal.querySelectorAll('.selectable-card');
    cards.forEach(c => {
      c.addEventListener('click', (ev)=>{
        // reset borders
        cards.forEach(x=>x.style.borderColor='rgba(255,255,255,0.04)');
        c.style.borderColor = hexToRgba('#00e5a8',0.9);
        const dt = c.dataset.enemy;
        const lc = c.dataset.lcolor;
        if(dt) { gamesModal._selectedEnemyType = dt; gameConfig.enemyType = dt; }
        if(lc) { gamesModal._selectedLaserColor = lc; gameConfig.laserColor = lc; }
      });
    });

    // keep face expression element updated via animate loop by id 'hf_face_expr'
    // modal buttons
    gamesModal.querySelector('#hf_games_close').addEventListener('click', ()=>{ gamesModal.remove(); gamesModal = null; });
    gamesModal.querySelector('#hf_laser_start').addEventListener('click', ()=>{ startLaserGame(); });
    gamesModal.querySelector('#hf_laser_stop').addEventListener('click', ()=>{ stopLaserGame(); });
    gamesModal.querySelector('#hf_laser_reset').addEventListener('click', ()=>{ laserScore = 0; const s = document.getElementById('hf_score'); if(s) s.textContent='0'; });

    gamesModal.querySelector('#hf_hit_start').addEventListener('click', ()=>{ startHitBallGame(); });
    gamesModal.querySelector('#hf_hit_stop').addEventListener('click', ()=>{ stopHitBallGame(); });
    gamesModal.querySelector('#hf_hit_reset').addEventListener('click', ()=>{ hitScore = 0; });

    gamesModal.querySelector('#calibr_lwidth').addEventListener('input', (e)=>{
      const v = Number(e.target.value);
      gameConfig.laserWidth = v;
      CONFIG.laserWidth = v;
      toast(`Laser width set to ${v}`);
    });

    const modalSkel = gamesModal.querySelector('#modal_skeleton_color');
    const modalTorso = gamesModal.querySelector('#modal_torso_color');
    modalSkel.addEventListener('input', (e)=>{
      gameConfig.skeletonColor = e.target.value;
      skeletonColorInput.value = e.target.value;
      toast('Skeleton color updated');
    });
    modalTorso.addEventListener('input', (e)=>{
      gameConfig.torsoColor = e.target.value;
      if(clothesColorInput) clothesColorInput.value = e.target.value;
      toast('Torso color updated');
    });
    const mbw = gamesModal.querySelector('#modal_bone_width');
    if (mbw) {
      mbw.addEventListener('input', (e) => {
        const v = Number(e.target.value);
        gameConfig.boneWidth = v;
        toast(`Bone width set to ${v}`);
      });
    }

    // show / hide current config
    const showBtn = gamesModal.querySelector('#modal_show_config');
    const copyBtn = gamesModal.querySelector('#modal_copy_config');
    const cfgView = gamesModal.querySelector('#modal_config_view');

    if (showBtn && cfgView) {
      showBtn.addEventListener('click', () => {
        if (cfgView.style.display === 'none') {
          cfgView.textContent = JSON.stringify(gameConfig, null, 2);
          cfgView.style.display = 'block';
          showBtn.textContent = 'Hide Config';
        } else {
          cfgView.style.display = 'none';
          showBtn.textContent = 'Show Current Config';
        }
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(JSON.stringify(gameConfig, null, 2));
          toast('Config copied to clipboard');
        } catch (e) {
          toast('Copy failed');
        }
      });
    }

  }

  // face modal (unchanged)
  let faceModal = null;
  openFaceFilterModalBtn?.addEventListener('click', openFaceFilterModal);
  function openFaceFilterModal(){
    if(faceModal){ faceModal.classList.add('show'); return; }
    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0">Face Filters</h3>
        <div><button id="hf_face_close" class="btn">Close</button></div>
      </div>
      <div style="margin-top:10px">
        <div style="display:flex;gap:8px;">
          <select id="hf_modal_filter" style="flex:1">
            <option value="none">None</option>
            <option value="glasses">Glasses</option>
            <option value="hat">Hat</option>
            <option value="mask">Mask</option>
          </select>
          <button id="hf_face_apply" class="btn primary">Apply</button>
        </div>
        <div style="margin-top:8px;font-size:12px;color:#ccc">Preview: hold your face in front of camera. Filters are anchored automatically.</div>
      </div>
    `;
    faceModal = createModal(html);
    faceModal.querySelector('#hf_face_close').addEventListener('click', ()=>{ faceModal.remove(); faceModal = null; });
    faceModal.querySelector('#hf_face_apply').addEventListener('click', ()=>{
      const v = faceModal.querySelector('#hf_modal_filter').value;
      if(filterSelect) filterSelect.value = v;
      filterToggle.dataset.state = 'on';
      filterToggle.textContent = 'Filter: On';
      toast('Filter applied');
    });
  }

  /* ---------------- GAME START/STOP FUNCTIONS ---------------- */
  function startLaserGame(){
    activeGame = GameMode.LASER;
    laserState.running = true;
    enemies = [];
    laserScore = 0;
    if(enemySpawnTimer) clearInterval(enemySpawnTimer);
    enemySpawnTimer = setInterval(()=>spawnEnemy(gameConfig.enemyType), CONFIG.enemySpawnMs);
    toast('Laser game started');
  }
  function stopLaserGame(){
    activeGame = GameMode.NONE;
    if(enemySpawnTimer){ clearInterval(enemySpawnTimer); enemySpawnTimer = null; }
    toast('Laser game stopped');
  }

  let hitBallSpawnTimer = null;
  function startHitBallGame(){
    activeGame = GameMode.HITBALL;
    hitBalls = [];
    hitScore = 0;
    if(hitBallSpawnTimer) clearInterval(hitBallSpawnTimer);
    hitBallSpawnTimer = setInterval(()=>spawnHitBall(), 900);
    toast('Hit-Ball game started');
  }
  function stopHitBallGame(){
    activeGame = GameMode.NONE;
    if(hitBallSpawnTimer){ clearInterval(hitBallSpawnTimer); hitBallSpawnTimer = null; }
    toast('Hit-Ball game stopped');
  }

  /* ---------------- CARD STYLE INJECTION ---------------- */
  (function injectCardStyles(){
    const s = document.createElement('style');
    s.textContent = `
      .selectable-card.hf-hover { box-shadow: 0 6px 20px rgba(0,230,150,0.12); transform: translateY(-4px); border-color: rgba(0,230,150,0.95) !important; }
      .selectable-card { transition: all .18s; }
      .hf-modal .hf-panel { max-height: 84vh; overflow:auto; }
      #hf_face_expr { color: #9be7c4; font-weight:600; }
    `;
    document.head.appendChild(s);
  })();

  /* ---------------- BOOT ---------------- */
  toast('HANDORA loaded — open Games to configure & start', 4200);
  (async ()=>{ try{ await loadFaceMesh(); }catch(e){} })();

  /* ---------------- EXPORT API ---------------- */
  window.HANDORA = {
    start: async () => { if(!running) startBtn?.click(); },
    stop: () => { if(running) stopBtn?.click(); },
    startLaserGame,
    stopLaserGame,
    startHitBallGame,
    stopHitBallGame,
    setLaserColor: (c) => { gameConfig.laserColor = c; },
    setSkeletonColor: (c) => { gameConfig.skeletonColor = c; skeletonColorInput.value = c; },
    getState: () => ({ running, activeGame, laserScore, hitScore, gameConfig })
  };

})();
