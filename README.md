# HANDORA — Advanced v3 (Hand/Arm/Body + Laser)

**Developed by** Prevonix Technologies
**Author** Mayank Chawdhari

> A browser-based hand/face/body interaction demo using **MediaPipe** (Hands, FaceMesh, Pose).
> Features two mini-games (Laser, Hit-The-Ball), a persistent laser cursor, face filters, and on-canvas visual skeletons with configurable appearance.

---

# Table of contents

1. [Project overview](#project-overview)
2. [Features](#features)
3. [Quick start](#quick-start)
4. [Files & key functions (tabular)](#files--key-functions-tabular)
5. [How detection & models are used / accuracy notes](#how-detection--models-are-used--accuracy-notes)
6. [Configuration & UI elements](#configuration--ui-elements)
7. [License & credits](#license--credits)

---

# Project overview

HANDORA is a single-page web application that uses MediaPipe models to detect hands, pose and facial landmarks. It overlays an interactive skeleton and face bones on the camera feed, provides a persistent **laser cursor** controlled by hand movement, and includes two games:

* **Laser Game** — destroy falling enemies (balls, squares, drones) with a laser.
* **Hit-The-Ball** — keep balls in the air by hitting them with your hand.

The app is implemented with plain **HTML, CSS, and JavaScript** (no build step required). It is intended for local / demo use in modern browsers (Chrome, Edge, Firefox with up-to-date WebRTC/camera support).

---

# Features

* Real-time hand, face and pose detection using **MediaPipe Hands / FaceMesh / Pose**.
* Persistent **laser cursor** (configurable color + width) controlled by hand/wrist/palm.
* Two games:

  * **Laser**: enemies spawn at top and fall down; laser destroys enemies; score + difficulty scaling.
  * **Hit-The-Ball**: balls spawn / fall; hit with open palm to score.
* Face filters: **glasses**, **hat**, **mask** (anchored to face landmarks).
* Config modal (Games modal) — change:

  * enemy type (ball / square / drone)
  * laser color & width
  * skeleton (bone) color
  * torso color
  * bone width
  * copy / show persistent `gameConfig`
* Visuals:

  * Skeleton and face bone rendering
  * Laser visuals: narrow core + layered glow
  * Flash / particle effects on hits
* Sound / speech toggles (beep / alarm / speech synthesis).
* Exported `window.HANDORA` API for programmatic control.

---

# Quick start

1. Clone repo / download files.
2. Serve over HTTP(S). Browser camera access requires a secure context (HTTPS) or `localhost`:

   ```bash
   # from repo root
   python -m http.server 8000
   # or (node)
   npx http-server -p 8000
   ```
3. Open `http://localhost:8000/modules/hand_gesture/index.html`.
4. Click **Start Camera**. Allow camera permission when prompted.
5. Open **Games** to try Laser / Hit-The-Ball and to change `gameConfig`.

---


---

# Files & key functions (tabular)

Below is a condensed table of the most important functions and what they do (file: **app.js**).

| Function / Symbol                                                  |     File | Purpose / usage                                                                                                                                                                      |
| ------------------------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `drawFaceBones(landmarks, mirror, poseLandmarks)`                  | `app.js` | Robust face bone renderer: jaw, nose bridge, eye loops, mouth, key dots and a neck line if pose shoulders are available. Uses `gameConfig.boneWidth` and `gameConfig.skeletonColor`. |
| `drawHeadBox(landmarks, mirror)`                                   | `app.js` | Draws a yellow ellipse around face — **debug/legacy** overlay. (Can be disabled)                                                                                                     |
| `lmkToCanvas(lm, mirror)`                                          | `app.js` | Converts normalized landmark `{x,y,z}` → canvas pixel coords (accounts for `devicePixelRatio` and mirror toggle).                                                                    |
| `drawHand(landmarks, label, mirror, useThick)`                     | `app.js` | Draws the hand skeleton and joints (line width uses `gameConfig.boneWidth`).                                                                                                         |
| `drawSkeletonPose(landmarks, mirror, drawFilledTorso)`             | `app.js` | Draws pose skeleton (arms/legs/torso) and optional filled torso with `gameConfig.torsoColor`.                                                                                        |
| `drawFilters(faceLandmarks, mirror)`                               | `app.js` | Anchored face filter drawing (glasses, hat, mask). Controlled by `filterToggle` & `filterSelect`.                                                                                    |
| `loadFaceMesh()`                                                   | `app.js` | Loads MediaPipe FaceMesh and sets `lastFaceMulti` via `onResults`.                                                                                                                   |
| `setupCameraAndStart()`                                            | `app.js` | Creates video element and Camera() loop that sends frames to MediaPipe models.                                                                                                       |
| `computeIndexAim(landmarks, mirror)`                               | `app.js` | Compute aiming origin+direction using index-tip + finger geometry.                                                                                                                   |
| `drawLaserBeamVisual(origin, dir, color)`                          | `app.js` | Draw laser: layered glow + core + muzzle flash. Core width uses `gameConfig.laserWidth`.                                                                                             |
| `applyLaserHits(origin, dir)`                                      | `app.js` | Ray-cast along laser; damages/removes `enemies` and `hitBalls` if within range.                                                                                                      |
| `spawnEnemy(type)` / `spawnHitBall()`                              | `app.js` | Create enemies and hit-balls with randomized positions & velocity.                                                                                                                   |
| `stepEnemies(dt)` / `stepHitBalls(dt)`                             | `app.js` | Physics update — move objects according to speed/gravity; apply removal when off-screen.                                                                                             |
| `startLaserGame()` / `stopLaserGame()`                             | `app.js` | Start/stop Laser game; spawns enemies via `setInterval`. Uses `gameConfig.enemyType`.                                                                                                |
| `startHitBallGame()` / `stopHitBallGame()`                         | `app.js` | Start/stop Hit-Ball; spawns balls periodically.                                                                                                                                      |
| `animate()`                                                        | `app.js` | Main single-frame loop: draw feed, skeletons, face bones, laser visuals, games, HUD and effects.                                                                                     |
| `laserModalInteraction(handsArr)`                                  | `app.js` | Enables laser cursor selection in modal (hovering selectable cards).                                                                                                                 |
| `fingerExtended`, `thumbExtended`, `classifyHand`, `pinchDistance` | `app.js` | Hand classification utilities used to detect gestures (open, fist, point, gun_like, pinch, thumbs_up).                                                                               |
| `computeEAR`, `computeMAR`, `detectSmile`                          | `app.js` | Face metrics (eye aspect ratio, mouth aspect ratio) for blink/mouth detection, used in face expression summary.                                                                      |
| `spawnFlash`, `stepAndDrawFlashes`                                 | `app.js` | Visual particle / flash effects used on hits.                                                                                                                                        |
| `window.HANDORA` API                                               | `app.js` | Programmatic control: `.start()`, `.stop()`, `.startLaserGame()`, `.setLaserColor()`, `.getState()`, etc.                                                                            |

---

# How detection & models are used (accuracy details)

**Models used**

* **MediaPipe Hands** (`Hands`) — `maxNumHands: 2`, `modelComplexity: 1` by default, min detection/tracking configurable via UI.
* **MediaPipe Pose** (`Pose`) — `modelComplexity: 1`, smoothLandmarks true, used to draw full-body skeleton and shoulders for neck line.
* **MediaPipe FaceMesh** (`FaceMesh`) — `maxNumFaces: 2`, `refineLandmarks: true` (attempts to provide iris/eye keypoints).

**Important options & defaults**

* `FaceMesh: minDetectionConfidence = 0.5`, `minTrackingConfidence = 0.5`
* `Hands: minDetectionConfidence = 0.5`, `minTrackingConfidence = 0.5`, `modelComplexity` from UI
* `gameConfig.laserWidth` default = `4`, can be adjusted in modal
* `gameConfig.boneWidth` default = `3` (controls skeleton & bone line width)

**Accuracy & best practices**

* Good lighting and a clear background improve landmark accuracy.
* Model complexity vs speed: increasing `modelComplexity` improves landmarks but is heavier. Use `handsComplexity` slider.
* For stable pose/neck detection, keep the camera framing so shoulders are visible (chest in frame).
* FaceMesh `refineLandmarks: true` improves eye/iris points but increases CPU.

---

# Configuration & UI elements (what to change where)

**Panel controls (right side)**

* Start/Stop Camera — start/stop detection loop.
* Body Mode — toggles pose skeleton drawing.
* Particles / Effects — toggle particle visual effects.
* Face Filter select + Filter toggle — choose/enable face overlays.
* Hands complexity / detection confidence — performance / accuracy tradeoffs.
* Mirror toggle — mirror canvas & handedness.

**Games modal (Open Games)**

* Start/Stop Laser & Hit-Ball.
* Enemy chooser: `ball`, `square`, `drone` (persisted to `gameConfig.enemyType`).
* Laser Color cards (persist to `gameConfig.laserColor`).
* Laser Width slider (`calibr_lwidth`) → updates `gameConfig.laserWidth` and `CONFIG.laserWidth`.
* Skeleton & Torso color pickers → update `gameConfig.skeletonColor`, `gameConfig.torsoColor` (and the hidden `skeletonColorInput` so drawing code reads it).
* Bone Width slider → updates `gameConfig.boneWidth`.
* Show / Copy Config → shows/copies current `gameConfig` JSON.

---

# Troubleshooting checklist

If things don’t look right:

1. Confirm camera permission granted and you're serving via `localhost` or HTTPS.
2. Open devtools console and watch for errors like `faceMesh` undefined or DOM `null`.
3. Disable debug green dots / remove `drawHeadBox()` if face bones are hidden.
4. Lower `handsComplexity` or toggle `Particles` to improve FPS.
5. If audio is silent, interact with the page first (click) to allow autoplay in some browsers.

---



```md
# HANDORA — Advanced v3
**Developed by** Prevonix Technologies — Mayank Chawdhari

See full README for usage, configuration, and known issues.
```

---

# Tech stack

* **HTML / CSS / JavaScript** (vanilla; no frameworks)
* **MediaPipe** libraries:

  * `@mediapipe/hands`
  * `@mediapipe/pose`
  * `@mediapipe/face_mesh`
  * `@mediapipe/camera_utils`
  * `@mediapipe/drawing_utils`

---

# Final notes & credits

**Author / Maintainer**: Mayank Chawdhari
**Organization**: Prevonix Technologies

