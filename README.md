# 🌾 Nepali Story Studio

A free 3D story maker for Nepali rural-life videos. It runs **entirely in your browser** — no installs, no accounts, no API keys, no paid services.

* 10 scenes: Rural Village, Rural Home, Agriculture Farm, Animal Keeping Farm, Hen Farm, Inside Rural House, Microfinance Office, Microfinance Office Desk, Village Pathway, Outside Home Courtyard
* 8 characters: Rural Nepali woman, old Nepali man, Microfinance employee (green T-shirt, orange collar, jeans), other Microfinance employee, group of women, goat, chicken, pig (max 5 per scene)
* 24 objects: money notes/coins, chair, table, gundro, galaicha, doko, nanglo, pots, kodalo, sickle, rice bundle, notebook, passbook, calculator, broom, bucket, firewood, cot…
* 19 human actions (walk, run, talk, sit, wave, hand/receive/count money, write, dig a hole, plant rice, harvest, carry doko, sweep, feed chicken, milk goat, sit on gundro…) + animal walk/run/eat
* Dialog by browser text-to-speech (Edge / Chrome voices), uploaded audio, or microphone recording; one narration file and one music file per scene
* Export to **MP4 (H.264+AAC)** or WebM (VP9+Opus) with all audio mixed in

## Put it online (no software to install)

### 1. GitHub (website only)
1. Sign in at <https://github.com> → **New repository** → name it `nepali-story-studio` → **Create repository**.
2. Unzip this project on your computer. In the new repository click **uploading an existing file**.
3. Drag in **everything inside the unzipped folder** (`index.html`, `package.json`, `vite.config.js`, the `src` and `public` folders, …). Do **not** upload `node_modules` or `dist`. Click **Commit changes**.
   *(GitHub's web uploader accepts up to 100 files at a time; this project has about 25.)*

### 2. Vercel (website only)
1. Go to <https://vercel.com> → **Sign up with GitHub** (free Hobby plan).
2. **Add New → Project** → pick your `nepali-story-studio` repository → **Import**.
3. Leave every setting at its default (Framework: Vite) → **Deploy**.
4. In about a minute you get a link such as `https://nepali-story-studio.vercel.app`. Open it in **Chrome or Edge**.

## How to use

| Want to… | Do this |
|---|---|
| Add / remove / reorder scenes | Left panel → choose a scene type → **+ Add scene**; ▲ ▼ ✕ on each scene. Set duration, time of day and fog under *This scene*. |
| Add a character | Right panel → **Characters** → choose → **+ Add** (max 5). Click it in the 3D view or the list to edit. |
| Move / turn it | Drag the gizmo in the 3D view (✥ Move, ⟳ Turn), or type X, Z and Facing. |
| Make it walk | Select the character → **✎ Draw path** → click the ground to add points. Set *Start walking at* and *Speed*. Use *Face after* to set the facing when it arrives. |
| Give actions | **Actions timeline** → *+ Add action at playhead*, pick an action, and optionally *on chair / on floor*. You can also drag action blocks on the timeline at the bottom. |
| Add objects | **Props** tab → choose → **+ Add**; move / turn / scale with the gizmo. |
| Camera | **Camera** tab → angle presets (wide, medium, close-up, over-the-shoulder, top, low), orbit freely with the mouse, change field of view. *+ Add end view* makes the camera glide from the start view to the end view. |
| Dialog | **Dialog** tab → **+ Add dialog**, pick the speaker and start time (or drag the green block on the timeline). Then **🗣 Speak**, **⬆ Upload**, or **⏺ Record**. |
| Male / female / narrator voice for everything | **Dialog** tab → *All dialog* → choose → **Apply to all**. Pick each voice under **🎙 Voices**. Each dialog can still choose its own voice. |
| Narration / music | Left panel → upload (or record narration) — one file each per scene; music loops with fade and volume. |
| Save / open | **Save** downloads a `.json` project (tick *with audio* to embed sounds). Your work is also auto-saved in the browser. |
| Export | **⬇ Export video** → scenes, resolution (720p/1080p), fps (24/30) → **Start**. Keep the tab open and visible. |
| Your own 3D models | Character or prop panel → **⬆ Upload .glb** replaces the built-in model. |

Tip: press **Space** to play/pause. *Quality* (top bar) offers Low / Medium / High for slower computers.

## Honest limitations

* **Realism:** this is stylised-realistic real-time 3D (PBR materials, soft shadows, procedural sky, ambient occlusion on High, bloom), not film quality. Characters are procedurally modelled (no scanned faces/hands). For higher realism, upload your own `.glb` models.
* **Text-to-speech:** uses your browser's own voices (Edge: Microsoft Natural voices; Chrome: Google voices), so quality and available languages depend on your browser/OS. Browser voices cannot be written into a file, so export them with *Live export* (see below). Recording yourself or uploading audio sounds best and exports fastest.
* **Voice type:** Male/Female/Narrator apply to the browser text-to-speech voice. Uploaded or recorded audio is used as it is (no voice conversion).
* **Export speed:** video is rendered frame-by-frame in your browser; a 1-minute 1080p video can take several minutes on a laptop GPU (much slower without a GPU). Chrome/Edge on desktop recommended. If your browser cannot encode MP4/AAC you automatically get WebM (the app tells you); if it has no WebCodecs at all it falls back to real-time recording.
* The first scene load generates textures procedurally, so it takes a few seconds. Very large uploaded audio/GLB files use browser storage (IndexedDB).
* Characters have no cloth/hair physics and use approximate (not IK) hand placement; tools may not touch the ground perfectly.
* Other microfinance employee is modelled as a woman in the same uniform.

## Run locally (optional)
```
npm install
npm run dev      # development
npm run build    # production build in dist/
```

## Licence
GPL-3.0-or-later. Three.js and the MP4/WebM muxers are MIT.

## Text-to-speech (Microsoft Edge / Google Chrome voices)

Dialog text is spoken with **your browser's own voices** (Edge: Microsoft "Natural" voices, including Hindi and Nepali where installed; Chrome: Google voices). This is the only TTS engine and it is the default for every dialog line.

- **Choose the voice for all lines:** `🎙 Voices` → pick the voice per Male / Female / Narrator, plus speed and pitch, with a "Test" button.
- **Per line:** in the Dialog tab use `🗣 Speak` to preview and `⏱ Measure` to set the line's length automatically. Uploading or recording audio replaces the browser voice for that line; remove the audio (🗑) to go back to it.
- **Preview** plays browser voices live while you press Play.
- **Export:** browsers cannot hand over TTS audio as a file, so when a project has browser-voice lines the Export window offers:
  1. **Live export** (default): records in real time, capturing system audio. When asked what to share, choose **Entire screen** and tick **Also share system audio**. Works in Chrome/Edge on Windows and ChromeOS (not macOS; a shared *tab* does not contain the voice). Takes as long as the video.
  2. **Skip**: those lines stay silent.
- Available voices depend on your OS/browser; if the list is empty, install a language voice in your OS settings and reload.
- Live export was tested only with a simulated audio source, not on real Windows hardware.

## Camera close-ups, scene length and side panel

- **Auto close-up on the speaker** (Camera tab): while a character speaks, the camera cuts to a slow push-in close-up of their face; narrator lines keep the normal scene camera.
- **Scenes grow with the dialog:** typing a long line, changing a start time, measuring or adding audio automatically lengthens the scene. `⏱ Measure all` measures every line with the browser voice, spaces them so they never overlap, and extends the scene.
- **Side panel:** the dialog text box grows with the text, nothing scrolls sideways, and you can drag the panel's left edge to make it wider.

## Lip-sync

The mouth now follows the **real** browser voice: it opens when the voice actually starts and closes when it stops (the 'talk' action in a character's timeline no longer moves the mouth by itself). The voice is started slightly early by its measured start-up delay, a scene never ends while a line is still being spoken, and after playback the real line lengths are saved. Live export first measures every line silently so scenes are long enough.

## Custom 3D models (.glb)

Upload a .glb on a character or object (Characters/Props tab). It is scaled to a sensible height, follows the character's path and facing, and is available in every scene and in the export.

- **Built-in animations:** if the model contains animation clips, pick which clip plays for *Standing / Walking / Running / Talking* (Auto guesses by clip name; walking and running are stepped by the distance travelled). Objects can loop a clip with an adjustable speed.
- **Lip-sync:** models with a mouth shape key (`mouthOpen`, `jawOpen` or `viseme_aa`, as in Ready Player Me avatars) move their mouth with the speech.
- **No animations?** The model glides along the path with a small bounce while walking and a gentle sway while talking.
- **Turn model:** rotate it 90/180/270° if it faces the wrong way.
- Clips switch instantly (no cross-fade).

## Measure everything in one click

The toolbar button **⏱ Measure all** measures the speech of every dialog in every scene (silent, in real time), spaces the lines and lengthens scenes to fit. Click again to stop.

## New: features from the 2D StoryStage project

- **51 painted scenes** (house, kitchen, farm, school, city, fantasy, events, studio …) can be chosen as the *Environment* of any scene, next to the 3D village scenes. They are painted behind the 3D characters; moving the camera zooms/pans them, and per scene you can set weather (rain, snow, fog, sun rays, leaves), a colour filter, size/shift, and whether the backdrop animates. A new **Night** time of day was added for all scenes.
- **🧰 Tools ▾** (top bar)
  - **Script → scenes** (text to scene maker): write `Name: line` scripts with `# Scene | Background`, `@time`, `@weather`, `@camera`, `@title`, `[Ram: walk to Sita]`, `[Ram: sit for 4]`; characters, positions, walking, actions and timing are created for you. *Download story as script* turns your project back into text.
  - **Sample stories / Import 2D project:** converts every scene of a StoryStage `.storystage.json` (two Hindi/Nepali stories are included).
  - **Subtitle files** (.srt / .vtt), **auto close-up** and **face camera** for all scenes, and **Version history** (automatic snapshots, restore any of the last 10).
- **Speech bubbles** above the speaking character (speech, thought, shout, box, whisper) – choose a default in ⚙ Settings or per dialog line. Lines can be **Silent** (text only).
- **Subtitles burned into the video** (classic, boxed, karaoke highlight), **titles / caption bars** per scene, an optional **watermark**.
- **Video formats:** 16:9, 9:16 (Shorts/Reels/TikTok), 1:1, 4:5 and 4:3 in the Export window.

Note: the painted backdrops are flat pictures; for the best result keep characters standing around the centre of the frame and adjust *Shift up/down* so their feet sit on the painted floor.

## Character library (all 44 characters of the 2D StoryStage project)

- **Characters tab → Library → + Add:** farmers, police, doctor, nurse, teacher, king, queen, wizard, pirate, chef, soldier, pilot, grandparents, students, kids, bride/groom, monk … all as 3D characters built from the same adjustable parts as in the 2D project (skin, hair style + colour, beard, glasses, hat, outfit, sleeves, trousers/skirt/dhoti, shoes, accessories, build, weight).
- After adding one, the **Appearance** panel lets you change any part and colour.
- **In scripts:** use a role tag to pick a library character: `Raja (m, king): …`, `Ram (m, farmer): …`, `Sunita (f, police): …`, `Dr (m, doctor)`, or an exact id (`nepali_police`). Without a role, the original 3D Nepali characters are used.
- **Imported 2D stories** use their own exact character looks.

## Importing scripts from a .txt file

- **🧰 Tools → 📂 Import a script from a .txt file…**, or **📂 Load .txt file** inside *Script → scenes*, or simply **drag & drop a .txt file onto the window** (a 2D StoryStage .json dropped on the window is imported too).
- UTF-8 and UTF-16 (Windows "Unicode") text files with Devanagari are supported. The text is shown first so you can check it, then press ✨ Create scenes.
