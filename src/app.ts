import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";

import {
  Engine,
  Scene,
  Vector3,
  Mesh,
  Color3,
  Color4,
  ShadowGenerator,
  GlowLayer,
  PointLight,
  FreeCamera,
  CubeTexture,
  Sound,
  PostProcess,
  Effect,
  SceneLoader,
  Matrix,
  MeshBuilder,
  Quaternion,
  AssetsManager,
  EngineFactory,
  ArcRotateCamera,
  HemisphericLight,
  StandardMaterial,
  Animation,
  QuadraticEase,
  TransformNode,
} from "@babylonjs/core";
import { PlayerInput } from "./inputController";
import { Player } from "./Player";
import { Hud } from "./ui";
import {
  AdvancedDynamicTexture,
  StackPanel,
  Button,
  TextBlock,
  Rectangle,
  Control,
  Image,
} from "@babylonjs/gui";
import { Environment } from "./environment";
import createCharacter from "./playerCreation";

//enum for states
enum State {
  START = 0,
  GAME = 1,
  LOSE = 2,
  CUTSCENE = 3,
  CHARACTER_CREATION = 4,
}

// App class is our entire game application
class App {
  // General Entire Application
  private _scene: Scene;
  private _canvas: HTMLCanvasElement;
  private _engine: Engine;

  //Game State Related
  public assets;
  private _input: PlayerInput;
  private _player: Player;
  private _ui: Hud;
  private _environment;
  public enemies = [];
  public attackInterval;
  public damageTimeout;
  public trees = [];

  //Character details
  public equippedItems;
  public characterBox: Mesh;
  public isMoving: boolean = false;
  public characterSpeed: number = 4;
  public ourTargetPos: Vector3; // Vector 3
  public targetName = undefined;
  public isAttacking;
  public targetId = undefined;
  public heroDamage;
  public heroLife = { currHp: 100, maxHp: 100 };
  public heroLvl = 1;
  public GAMEOVER = false;

  // Animations
  public characterIdle;
  public characterAttacking;
  public characterRunning;
  public anims;

  //Sounds
  // public sfx: Sound;
  public game: Sound;
  public end: Sound;
  public runningSound: Sound;
  public attackingSound: Sound;

  //Scene - related
  private _state: number = 0;
  private _gamescene: Scene;
  private _cutScene: Scene;

  //post process
  private _transition: boolean = false;

  constructor() {
    this._canvas = this._createCanvas();

    // initialize babylon scene and engine
    this._init();
  }

  private async _init(): Promise<void> {
    this._engine = (await EngineFactory.CreateAsync(
      this._canvas,
      undefined
    )) as Engine;
    this._scene = new Scene(this._engine);

    //**for development: make inspector visible/invisible
    window.addEventListener("keydown", (ev) => {
      //Shift+Ctrl+Alt+I
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
        if (this._scene.debugLayer.isVisible()) {
          this._scene.debugLayer.hide();
        } else {
          this._scene.debugLayer.show();
        }
      }
    });

    //MAIN render loop & state machine
    await this._main();
  }

  private async _main(): Promise<void> {
    await this._goToStart();

    // Register a render loop to repeatedly render the scene
    this._engine.runRenderLoop(() => {
      switch (this._state) {
        case State.START:
          this._scene.render();
          break;
        case State.CHARACTER_CREATION:
          this._scene.render();
          break;
        case State.CUTSCENE:
          this._scene.render();
          break;
        case State.GAME:
          //if 240seconds/ 4mins have have passed, go to the lose state
          // if (this._ui.time >= 240 && !this._player.win) {
          //   this._goToLose();
          //   this._ui.stopTimer();
          // }
          if (this._ui.quit) {
            console.log("Quit flag is true");
            this._goToStart();
            this._ui.quit = false;
            // this.equippedItems = localStorage.removeItem("Equipped items")
          }
          this._scene.render();
          break;
        case State.LOSE:
          this._scene.render();
          break;
        default:
          break;
      }
    });

    //resize if the screen is resized/rotated
    window.addEventListener("resize", () => {
      this._engine.resize();
    });
  }

  //set up the canvas
  private _createCanvas(): HTMLCanvasElement {
    //Commented out for development
    document.documentElement.style["overflow"] = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.width = "100%";
    document.documentElement.style.height = "100%";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.body.style.overflow = "hidden";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    //create the canvas html element and attach it to the webpage
    this._canvas = document.createElement("canvas");
    this._canvas.style.width = "100%";
    this._canvas.style.height = "100%";
    this._canvas.id = "gameCanvas";
    document.body.appendChild(this._canvas);

    return this._canvas;
  }

  // goToStart
  private async _goToStart() {
    this._engine.displayLoadingUI(); //make sure to wait for start to load

    //--SCENE SETUP--
    //dont detect any inputs from this ui while the game is loading
    this._scene.detachControl();
    let scene = new Scene(this._engine);
    scene.clearColor = new Color4(0, 0, 0, 1);
    //creates and positions a free camera
    let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
    camera.setTarget(Vector3.Zero()); //targets the camera to scene origin

    //--SOUNDS--
    const start = new Sound(
      "startSong",
      "./sounds/mainThemeMozartRequiem.mp3",
      scene,
      function () {},
      {
        volume: 0.5,
        loop: true,
        autoplay: true,
      }
    );
    const sfx = new Sound(
      "selection",
      "./sounds/vgmenuselect.wav",
      scene,
      function () {}
    );

    //--GUI--
    const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    guiMenu.idealHeight = 720;

    //background image
    const imageRect = new Rectangle("titleContainer");
    imageRect.width = 0.8;
    imageRect.thickness = 0;
    guiMenu.addControl(imageRect);

    const startbg = new Image("startbg", "sprites/valgavoth.jpg");
    imageRect.addControl(startbg);

    const title = new TextBlock("title", "Valgavoth");
    title.resizeToFit = true;
    title.fontFamily = "Metamorphous";
    title.fontSize = "64px";
    title.color = "white";
    title.resizeToFit = true;
    title.top = "14px";
    title.width = 0.8;
    title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    imageRect.addControl(title);

    const startBtn = Button.CreateSimpleButton("start", "PLAY");
    startBtn.fontFamily = "Metamorphous";
    startBtn.width = 0.2;
    startBtn.height = "40px";
    startBtn.color = "white";
    startBtn.top = "-14px";
    startBtn.thickness = 0;
    startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    imageRect.addControl(startBtn);

    //set up transition effect : modified version of https://www.babylonjs-playground.com/#2FGYE8#0
    Effect.RegisterShader(
      "fade",
      "precision highp float;" +
        "varying vec2 vUV;" +
        "uniform sampler2D textureSampler; " +
        "uniform float fadeLevel; " +
        "void main(void){" +
        "vec4 baseColor = texture2D(textureSampler, vUV) * fadeLevel;" +
        "baseColor.a = 1.0;" +
        "gl_FragColor = baseColor;" +
        "}"
    );

    let fadeLevel = 1.0;
    this._transition = false;
    scene.registerBeforeRender(() => {
      if (this._transition) {
        fadeLevel -= 0.05;
        if (fadeLevel <= 0) {
          this._goToCharacterCreationScene();

          this._transition = false;
        }
      }
    });

    //this handles interactions with the start button attached to the scene
    startBtn.onPointerDownObservable.add(() => {
      //fade screen
      const postProcess = new PostProcess(
        "Fade",
        "fade",
        ["fadeLevel"],
        null,
        1.0,
        camera
      );
      postProcess.onApply = (effect) => {
        effect.setFloat("fadeLevel", fadeLevel);
      };
      this._transition = true;
      //sounds
      sfx.play();

      scene.detachControl(); //observables disabled
    });

    let isMobile = false;
    //--MOBILE--
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    ) {
      isMobile = true;
      //popup for mobile to rotate screen
      const rect1 = new Rectangle();
      rect1.height = 0.2;
      rect1.width = 0.3;
      rect1.verticalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      rect1.horizontalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      rect1.background = "white";
      rect1.alpha = 0.8;
      guiMenu.addControl(rect1);

      const rect = new Rectangle();
      rect.height = 0.2;
      rect.width = 0.3;
      rect.verticalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      rect.horizontalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      rect.color = "whites";
      guiMenu.addControl(rect);

      const stackPanel = new StackPanel();
      stackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
      rect.addControl(stackPanel);

      //image
      const image = new Image("rotate", "./sprites/rotate.png");
      image.width = 0.4;
      image.height = 0.6;
      image.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      rect.addControl(image);

      //alert message
      const alert = new TextBlock(
        "alert",
        "For the best experience, please rotate your device"
      );
      alert.fontSize = "16px";
      alert.fontFamily = "Viga";
      alert.color = "black";
      alert.resizeToFit = true;
      alert.textWrapping = true;
      stackPanel.addControl(alert);

      const closealert = Button.CreateSimpleButton("close", "X");
      closealert.height = "24px";
      closealert.width = "24px";
      closealert.color = "black";
      stackPanel.addControl(closealert);

      //remove control of the play button until the user closes the notification(allowing for fullscreen mode)
      startBtn.isHitTestVisible = false;

      closealert.onPointerUpObservable.add(() => {
        guiMenu.removeControl(rect);
        guiMenu.removeControl(rect1);

        startBtn.isHitTestVisible = true;
        this._engine.enterFullscreen(true);
      });
    }

    //--SCENE FINISHED LOADING--
    await scene.whenReadyAsync();
    this._engine.hideLoadingUI(); //when the scene is ready, hide loading
    //lastly set the current state to the start state and set the scene to the start scene
    this._scene.dispose();
    this._scene = scene;
    this._state = State.START;
  }

  private async _goToCharacterCreationScene(): Promise<void> {
    //--CREATE SCENE--
    let scene = new Scene(this._engine);
    this._gamescene = scene;

    //--SOUNDS--
    const start = new Sound(
      "charCreatSong",
      "./sounds/charCreaProkofievBattle.mp3",
      scene,
      function () {},
      {
        volume: 0.5,
        loop: true,
        autoplay: true,
      }
    );

    const light = new HemisphericLight("light", new Vector3(0, 20, 0), scene);

    const camera = new ArcRotateCamera(
      "camera",
      Math.PI / 2,
      Math.PI / 6,
      2,
      new Vector3(0, 0.8, 3),
      scene
    );
    camera.attachControl(this._canvas, true);
    camera.wheelPrecision = 100;
    camera.minZ = 0.01;
    camera.lowerRadiusLimit = 1;
    camera.upperRadiusLimit = 5;
    camera.panningSensibility = 0;

    await createCharacter(this._gamescene, camera, this._canvas, () =>
      this._goToCutScene()
    
    );
    
    //--SCENE FINISHED LOADING--
    await scene.whenReadyAsync();
    this._engine.hideLoadingUI(); //when the scene is ready, hide loading
    //lastly set the current state to the start state and set the scene to the start scene
    this._scene.dispose();
    this._scene = scene;
    this._state = State.CHARACTER_CREATION;
  }

  private async _goToCutScene(): Promise<void> {
    this._engine.displayLoadingUI();
    //--SETUP SCENE--
    //dont detect any inputs from this ui while the game is loading
    this._scene.detachControl();
    this._cutScene = new Scene(this._engine);
    let camera = new FreeCamera(
      "camera1",
      new Vector3(0, 0, 0),
      this._cutScene
    );
    camera.setTarget(Vector3.Zero());
    this._cutScene.clearColor = new Color4(0, 0, 0, 1);

    //--GUI--
    const cutScene = AdvancedDynamicTexture.CreateFullscreenUI("cutscene");
    let transition = 0; //increment based on dialogue
    let canplay = false;
    let finished_anim = false;
    let anims_loaded = 0;

    //Animations
    const beginning_anim = new Image(
      "sparkLife",
      "./sprites/beginning_anim.png"
    );
    beginning_anim.stretch = Image.STRETCH_UNIFORM;
    beginning_anim.cellId = 0;
    beginning_anim.cellHeight = 480;
    beginning_anim.cellWidth = 480;
    beginning_anim.sourceWidth = 480;
    beginning_anim.sourceHeight = 480;
    cutScene.addControl(beginning_anim);
    beginning_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const working_anim = new Image("sparkLife", "./sprites/working_anim.png");
    working_anim.stretch = Image.STRETCH_UNIFORM;
    working_anim.cellId = 0;
    working_anim.cellHeight = 480;
    working_anim.cellWidth = 480;
    working_anim.sourceWidth = 480;
    working_anim.sourceHeight = 480;
    working_anim.isVisible = false;
    cutScene.addControl(working_anim);
    working_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const dropoff_anim = new Image("sparkLife", "./sprites/dropoff_anim.png");
    dropoff_anim.stretch = Image.STRETCH_UNIFORM;
    dropoff_anim.cellId = 0;
    dropoff_anim.cellHeight = 480;
    dropoff_anim.cellWidth = 480;
    dropoff_anim.sourceWidth = 480;
    dropoff_anim.sourceHeight = 480;
    dropoff_anim.isVisible = false;
    cutScene.addControl(dropoff_anim);
    dropoff_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const leaving_anim = new Image("sparkLife", "./sprites/leaving_anim.png");
    leaving_anim.stretch = Image.STRETCH_UNIFORM;
    leaving_anim.cellId = 0;
    leaving_anim.cellHeight = 480;
    leaving_anim.cellWidth = 480;
    leaving_anim.sourceWidth = 480;
    leaving_anim.sourceHeight = 480;
    leaving_anim.isVisible = false;
    cutScene.addControl(leaving_anim);
    leaving_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const watermelon_anim = new Image(
      "sparkLife",
      "./sprites/watermelon_anim.png"
    );
    watermelon_anim.stretch = Image.STRETCH_UNIFORM;
    watermelon_anim.cellId = 0;
    watermelon_anim.cellHeight = 480;
    watermelon_anim.cellWidth = 480;
    watermelon_anim.sourceWidth = 480;
    watermelon_anim.sourceHeight = 480;
    watermelon_anim.isVisible = false;
    cutScene.addControl(watermelon_anim);
    watermelon_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const reading_anim = new Image("sparkLife", "./sprites/reading_anim.png");
    reading_anim.stretch = Image.STRETCH_UNIFORM;
    reading_anim.cellId = 0;
    reading_anim.cellHeight = 480;
    reading_anim.cellWidth = 480;
    reading_anim.sourceWidth = 480;
    reading_anim.sourceHeight = 480;
    reading_anim.isVisible = false;
    cutScene.addControl(reading_anim);
    reading_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });

    //Dialogue animations
    const dialogueBg = new Image(
      "sparkLife",
      "./sprites/bg_anim_text_dialogue.png"
    );
    dialogueBg.stretch = Image.STRETCH_UNIFORM;
    dialogueBg.cellId = 0;
    dialogueBg.cellHeight = 480;
    dialogueBg.cellWidth = 480;
    dialogueBg.sourceWidth = 480;
    dialogueBg.sourceHeight = 480;
    dialogueBg.horizontalAlignment = 0;
    dialogueBg.verticalAlignment = 0;
    dialogueBg.isVisible = false;
    cutScene.addControl(dialogueBg);
    dialogueBg.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });

    const dialogue = new Image("sparkLife", "./sprites/text_dialogue.png");
    dialogue.stretch = Image.STRETCH_UNIFORM;
    dialogue.cellId = 0;
    dialogue.cellHeight = 480;
    dialogue.cellWidth = 480;
    dialogue.sourceWidth = 480;
    dialogue.sourceHeight = 480;
    dialogue.horizontalAlignment = 0;
    dialogue.verticalAlignment = 0;
    dialogue.isVisible = false;
    cutScene.addControl(dialogue);
    dialogue.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });

    //looping animation for the dialogue background
    let dialogueTimer = setInterval(() => {
      if (finished_anim && dialogueBg.cellId < 3) {
        dialogueBg.cellId++;
      } else {
        dialogueBg.cellId = 0;
      }
    }, 250);

    //skip cutscene
    const skipBtn = Button.CreateSimpleButton("skip", "SKIP");
    skipBtn.fontFamily = "Viga";
    skipBtn.width = "45px";
    skipBtn.left = "-14px";
    skipBtn.height = "40px";
    skipBtn.color = "white";
    skipBtn.top = "14px";
    skipBtn.thickness = 0;
    skipBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    skipBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    cutScene.addControl(skipBtn);

    skipBtn.onPointerDownObservable.add(() => {
      this._cutScene.detachControl();
      clearInterval(animTimer);
      clearInterval(anim2Timer);
      clearInterval(dialogueTimer);
      this._engine.displayLoadingUI();
      canplay = true;
    });

    //--PLAYING ANIMATIONS--
    let animTimer;
    let anim2Timer;
    let anim = 1; //keeps track of which animation we're playing
    //sets up the state machines for animations
    this._cutScene.onBeforeRenderObservable.add(() => {
      if (anims_loaded == 8) {
        this._engine.hideLoadingUI();
        anims_loaded = 0;

        //animation sequence
        animTimer = setInterval(() => {
          switch (anim) {
            case 1:
              if (beginning_anim.cellId == 9) {
                //each animation could have a different number of frames
                anim++;
                beginning_anim.isVisible = false; // current animation hidden
                working_anim.isVisible = true; // show the next animation
              } else {
                beginning_anim.cellId++;
              }
              break;
            case 2:
              if (working_anim.cellId == 11) {
                anim++;
                working_anim.isVisible = false;
                dropoff_anim.isVisible = true;
              } else {
                working_anim.cellId++;
              }
              break;
            case 3:
              if (dropoff_anim.cellId == 11) {
                anim++;
                dropoff_anim.isVisible = false;
                leaving_anim.isVisible = true;
              } else {
                dropoff_anim.cellId++;
              }
              break;
            case 4:
              if (leaving_anim.cellId == 9) {
                anim++;
                leaving_anim.isVisible = false;
                watermelon_anim.isVisible = true;
              } else {
                leaving_anim.cellId++;
              }
              break;
            default:
              break;
          }
        }, 750);

        //animation sequence 2 that uses a different time interval
        anim2Timer = setInterval(() => {
          switch (anim) {
            case 5:
              if (watermelon_anim.cellId == 8) {
                anim++;
                watermelon_anim.isVisible = false;
                reading_anim.isVisible = true;
              } else {
                watermelon_anim.cellId++;
              }
              break;
            case 6:
              if (reading_anim.cellId == 11) {
                reading_anim.isVisible = false;
                finished_anim = true;
                dialogueBg.isVisible = true;
                dialogue.isVisible = true;
                next.isVisible = true;
              } else {
                reading_anim.cellId++;
              }
              break;
          }
        }, 750);
      }

      //only once all of the game assets have finished loading and you've completed the animation sequence + dialogue can you go to the game state
      if (finishedLoading && canplay) {
        canplay = false;
        this._goToGame();
      }
    });

    //--PROGRESS DIALOGUE--
    const next = Button.CreateImageOnlyButton("next", "./sprites/arrowBtn.png");
    next.rotation = Math.PI / 2;
    next.thickness = 0;
    next.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    next.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    next.width = "64px";
    next.height = "64px";
    next.top = "-3%";
    next.left = "-12%";
    next.isVisible = false;
    cutScene.addControl(next);

    next.onPointerUpObservable.add(() => {
      if (transition == 8) {
        //once we reach the last dialogue frame, goToGame
        this._cutScene.detachControl();
        this._engine.displayLoadingUI(); //if the game hasn't loaded yet, we'll see a loading screen
        transition = 0;
        canplay = true;
      } else if (transition < 8) {
        // 8 frames of dialogue
        transition++;
        dialogue.cellId++;
      }
    });

    //--WHEN SCENE IS FINISHED LOADING--
    await this._cutScene.whenReadyAsync();
    this._scene.dispose();
    this._state = State.CUTSCENE;
    this._scene = this._cutScene;

    //--START LOADING AND SETTING UP THE GAME DURING THIS SCENE--
    var finishedLoading = false;
    await this._setUpGame().then((res) => {
      finishedLoading = true;
    });
  }

  private async _setUpGame() {
    //async
    //--CREATE SCENE--
    let scene = new Scene(this._engine);
    this._gamescene = scene;

    //--SOUNDS--
    this._loadSounds(scene);
    this._characterSounds(scene);

    //--CREATE ENVIRONMENT--
    const environment = new Environment(scene);
    this._environment = environment;
    //Load environment and character assets
    this.equippedItems = JSON.parse(localStorage.getItem("Equipped items"));
    await this._environment.load(); //environment
    await this._loadCharacterAssets(scene); //character
    //--ANIMATIONS--
    await this._characterAnimations();
  }

  //loading sounds for the game scene
  private _loadSounds(scene: Scene): void {
    this.game = new Sound(
      "gameSong",
      "./sounds/RequiemGiuseppeVerdiDiesIraeLiberaMe.mp3",
      scene,
      function () {},
      {
        loop: true,
        volume: 0.1,
      }
    );

    this.end = new Sound(
      "endSong",
      "./sounds/copycat(revised).mp3",
      scene,
      function () {},
      {
        volume: 0.25,
      }
    );
  }

  private async _characterAnimations() {
    if (this._player) {
      this.characterIdle = this._player.idleAnimation;
      this.characterAttacking = this._player.attackAnimation;
    } else {
      console.warn("Player is not initialized yet. From _characterAnimations");
    }
  }

  private _characterSounds(scene: Scene): void {
    if (this._player) {
      this.runningSound = this._player.runningSound;
      this.attackingSound = this._player.attackingSound;

      // this.runningSound.setVolume(0.6) // Example: Adjust volume
    } else {
      console.warn("Player is not initialized yet. From _characterSounds");
    }
  }

  //goToGame
  private async _goToGame(): Promise<void> {
    //--SETUP SCENE--
    this._scene.detachControl();
    let scene = this._gamescene;

    //--GUI--
    const ui = new Hud(scene);
    this._ui = ui;
    //dont detect any inputs from this ui while the game is loading
    scene.detachControl();

    //IBL (image based lighting) - to give scene an ambient light
    const envHdri = CubeTexture.CreateFromPrefilteredData(
      "textures/envtext.env",
      scene
    );
    envHdri.name = "env";
    envHdri.gammaSpace = false;
    scene.environmentTexture = envHdri;
    scene.environmentIntensity = 0.04;

    //--INPUT--
    // this._input = new PlayerInput(scene, this._ui,); //detect keyboard/mobile inputs

    //Initializes the game's loop
    await this._initializeGameAsync(scene); //handles scene related updates & setting up meshes in scene

    //--WHEN SCENE FINISHED LOADING--
    await scene.whenReadyAsync();

    const camera = new ArcRotateCamera(
      "camera",
      Math.PI / 2,
      Math.PI / 3,
      20,
      new Vector3(0, 0, 0),
      scene
    );
    camera.attachControl(this._canvas, true);

    const light = new HemisphericLight("light", new Vector3(1, 1, 0), scene);
    light.intensity = 0.7;

    //get rid of start scene, switch to gamescene and change states
    this._scene.dispose();
    this._state = State.GAME;
    this._scene = scene;
    this._engine.hideLoadingUI();
    //the game is ready, attach control back
    this._scene.attachControl();

    //--SOUNDS--
    this.game.play(); // play the gamesong
  }

  //load the character model
  private async _loadCharacterAssets(scene): Promise<any> {
    const loadCharacter = async () => {
      //using arrow function ensures this is lexically bound to the App instance. with this correctly pointing to the App class, equippedItems will noe be accessible
      //--IMPORTING MESH--
      const Model = await SceneLoader.ImportMeshAsync(
        "",
        "/models/",
        "gameCharac.glb",
        scene
      );

      const anims = Model.animationGroups;
      const meshes = Model.meshes;
      const rootMesh = meshes[0];
      const characterBox = MeshBuilder.CreateBox(
        "characterBox",
        { size: 0.9, height: 2 },
        scene
      );
      rootMesh.parent = characterBox;
      characterBox.visibility = 0;
      rootMesh.position.y = -1;
      characterBox.position.y += 1;
      characterBox.isPickable = false;
      meshes.forEach((mesh) => (mesh.isPickable = false));
      rootMesh.addRotation(0, Math.PI, 0);

      this.characterBox = characterBox;
      this.anims = anims;

      // createTextMesh(equippedItems.characterName, "white", scene, characterBox, 2)

      // Helper function to toggle armor parts

      meshes.forEach((mesh) => {
        const isEquipped = Object.values(this.equippedItems).some(
          (itemName) => itemName && mesh.name === itemName
        );
        mesh.visibility = isEquipped ? 1 : mesh.name === "bodyp" ? 1 : 0;
      });

      // Load all sword models
      const swordModels = await SceneLoader.ImportMeshAsync(
        "",
        "/models/",
        "swords.glb",
        scene
      );

      const equippedWeaponName = this.equippedItems.weapon;

      console.log("Equipped Sword Meshes: ", equippedWeaponName);
      // Hide all swords initially
      swordModels.meshes.forEach((mesh) => {
        console.log(`Mesh Name: ${mesh.name}, Length: ${mesh.name.length}`);
        mesh.isVisible = false;
      });

      console.log("Equipped Weapon Name: ", equippedWeaponName);

      const equippedSwordMeshes = swordModels.meshes.filter((mesh) =>
        mesh.name.includes(equippedWeaponName)
      );

      console.log("Equipped Sword Meshes: ", equippedSwordMeshes);

      // Attach the sword to the hand if it exists
      if (equippedSwordMeshes.length > 0) {
        // Find the right hand bone of the character
        const rightHandBone = Model.skeletons[0]?.bones.find(
          (bone) => bone.name === "hand.R"
        );

        console.log("Right Hand Bone: ", rightHandBone); // Log to check if the bone is found

        if (rightHandBone) {
          // Create a holder node to position the sword
          const swordHolder = new TransformNode("swordHolder", scene);

          // Attach the swordHolder to the hand bone
          rightHandBone.getTransformNode()?.addChild(swordHolder);

          // Set the sword holder's position and rotation to align with the hand
          swordHolder.position = new Vector3(0, 0.5, 0);
          swordHolder.rotation = new Vector3(0, 0, Math.PI / 2);

          // Attach and adjust each part of the equipped sword mesh
          equippedSwordMeshes.forEach((swordMesh) => {
            swordMesh.parent = swordHolder;
            swordMesh.isVisible = true;
            swordMesh.scaling = new Vector3(0.1, 0.1, 0.1);
            swordMesh.position = new Vector3(0, 0, 0);
            swordMesh.rotation = new Vector3(Math.PI / 2, 0, 0);
          });
        } else {
          console.log("Right hand bone not found!");
        }
      } else {
        console.log("Equipped sword not found in sword models!");
      }

      // Load all shield models
      const shieldModels = await SceneLoader.ImportMeshAsync(
        "",
        "/models/",
        "shields.glb",
        scene
      );

      const equippedShieldName = this.equippedItems.shield;

      console.log("Equipped Shield Meshes: ", equippedShieldName);
      // Hide all shields initially
      shieldModels.meshes.forEach((mesh) => {
        mesh.isVisible = false;
      });

      console.log("Equipped Shield Name: ", equippedShieldName);

      // Find the specific shield meshes you want to equip
      const equippedShieldMeshes = shieldModels.meshes.filter((mesh) =>
        mesh.name.includes(equippedShieldName)
      );

      console.log("Equipped Shield Meshes: ", equippedShieldMeshes);

      // Attach the shield to the left hand if it exists
      if (equippedShieldMeshes.length > 0) {
        const leftHandBone = Model.skeletons[0]?.bones.find(
          (bone) => bone.name === "hand.L"
        );

        console.log("Left Hand Bone: ", leftHandBone); // Log to check if the bone is found

        if (leftHandBone) {
          // Create a holder node to position the shield
          const shieldHolder = new TransformNode("shieldHolder", scene);

          // Attach the shieldHolder to the left hand bone
          leftHandBone.getTransformNode()?.addChild(shieldHolder);

          // Set the shield holder's position and rotation to align with the hand
          shieldHolder.position = new Vector3(0, 0, 0);
          shieldHolder.rotation = new Vector3(0, 0, 0);

          // Attach and adjust each part of the shield mesh
          equippedShieldMeshes.forEach((shieldMesh) => {
            shieldMesh.parent = shieldHolder;
            shieldMesh.isVisible = true;
            shieldMesh.scaling = new Vector3(0.2, 0.2, 0.2);
            shieldMesh.position = new Vector3(0.05, 0.2, 0);
            shieldMesh.rotation = new Vector3(0, 0, 0);
          });
        } else {
          console.log("Left hand bone not found!");
        }
      } else {
        console.log("Shield mesh not found!");
      }
      return {
        mesh: characterBox as Mesh,
        animationGroups: anims,
      };
    };

    return loadCharacter().then((assets) => {
      this.assets = assets;
      console.log("assets:", this.assets);
    });
  }

  private calculateDistance(targetPos, ourPos) {
    return Vector3.Distance(targetPos, ourPos);
  }

  public Move(directionPos) {
    clearInterval(this.attackInterval);
    clearTimeout(this.damageTimeout);
    this.isMoving = true;
    this.isAttacking = false;
    const { x, z } = directionPos;
    this.characterBox.lookAt(
      new Vector3(x, this.characterBox.position.y, z),
      0,
      0,
      0
    );
    this.characterIdle.stop();
    this.characterAttacking.stop();
    this.characterRunning.play(true);
    this.runningSound.play();
  }

  private Stop() {
    clearInterval(this.attackInterval);
    clearTimeout(this.damageTimeout);
    this.isMoving = false;
    this.characterRunning.stop();
    this.characterIdle.play(true);
    this.ourTargetPos = undefined;
    this.runningSound.stop();
  }

  private Attack(directionPos) {
    const treeDetail = this.trees.find((tree) => tree._id === this.targetId);
    const enemyDetail = this.enemies.find(
      (enemy) => enemy._id === this.targetId
    );

    if (this.targetName === "tree" && !treeDetail)
      return console.log("target tree not found");
    if (this.targetName.includes("enemy") && !enemyDetail)
      return console.log("enemy not found");

    let targetDetail;
    if (this.targetName === "tree") targetDetail = treeDetail;
    if (this.targetName.includes("enemy")) targetDetail = enemyDetail;

    this.isMoving = false;
    this.isAttacking = true;
    const { x, z } = directionPos;
    this.characterBox.lookAt(
      new Vector3(x, this.characterBox.position.y, z),
      0,
      0,
      0
    );

    this.characterIdle.stop();
    this.characterRunning.stop();
    this.characterAttacking.play();

    this.damageTimeout = setTimeout(() => {
      const hpAfterDamage = targetDetail.hp - this.heroDamage;
      targetDetail.hp = hpAfterDamage;
      this.attackingSound.play();
      if (hpAfterDamage <= 0) {
        if (this.targetName === "tree")
          this.trees = this.trees.filter((tree) => tree._id !== this.targetId);
        if (this.targetName.includes("enemy")) {
          enemyDetail.anims.forEach(
            (anim) => anim.name === "attack0" && anim.stop()
          );
          enemyDetail.anims.forEach(
            (anim) => anim.name === "0Idle" && anim.stop()
          );
          enemyDetail.anims.forEach(
            (anim) => anim.name === "death" && anim.play()
          );
          this.enemies = this.enemies.filter(
            (enemy) => enemy._id !== this.targetId
          );

          this.targetId = undefined;
          this.ourTargetPos = undefined;
          this.isAttacking = false;

          this.characterIdle.play();
          this.characterAttacking.stop();
          enemyDetail.deathSound.play();
          this.Stop();
          setTimeout(() => {
            return targetDetail.mesh.dispose();
          }, 10000);

          targetDetail.mesh.isPickable = false;

          this.heroLife.maxHp += 10;
          this.heroLife.currHp = this.heroLife.maxHp + 10;
          this.heroLvl += 1;
          this.heroDamage += 5;
          // this.heroLevelText.text = `lvl. ${this.heroLvl}`;

          console.log(this.heroDamage);
        } else {
          return targetDetail.mesh.dispose();
        }
      }

      targetDetail.lifeBarUi.width = `${
        (targetDetail.hp / targetDetail.maxHp) * 100 * 1
      }px`;
    }, 800);
  }

  private InitializeAttack() {
    //check if the character is aready attacking
    if (this.isAttacking) return;

    clearInterval(this.attackInterval);
    this.characterRunning.stop();
    this.runningSound.stop();
    this.Attack(this.ourTargetPos);
    this.attackInterval = setInterval(() => {
      if (this.GAMEOVER) return clearInterval(this.attackInterval);
      this.Attack(this.ourTargetPos);
    }, 2000);
  }

  //init game
  private async _initializeGameAsync(scene): Promise<void> {
    scene.ambientColor = new Color3(
      0.34509803921568627,
      0.5568627450980392,
      0.8352941176470589
    );
    scene.clearColor = new Color4(
      0.01568627450980392,
      0.01568627450980392,
      0.20392156862745098
    );

    const light = new PointLight("sparklight", new Vector3(0, 0, 0), scene);
    light.diffuse = new Color3(
      0.08627450980392157,
      0.10980392156862745,
      0.15294117647058825
    );
    light.intensity = 35;
    light.radius = 1;

    //Create the player

    this._player = new Player(this.assets, scene, this._input);

    this.runningSound = this._player.runningSound;
    this.attackingSound = this._player.attackingSound;
    this.characterIdle = this._player.idleAnimation;
    this.characterAttacking = this._player.attackAnimation;
    this.characterRunning = this._player.runningAnimation;

    const cameraContainer = MeshBuilder.CreateGround(
      "ground",
      { width: 0.5, height: 0.5 },
      scene
    );
    cameraContainer.position = new Vector3(0, 15, 0);
    // cameraContainer.position = new Vector3(0, 5, -2.5);
    cameraContainer.addRotation(0, Math.PI, 0);
    const cam = new FreeCamera("camera", new Vector3(0, 0, -5), scene);

    cam.parent = cameraContainer;
    cam.setTarget(new Vector3(0, -10, 0));

    let camVertical = 0;
    let camHorizontal = 0;
    let camSpd = 3;

    scene.registerAfterRender(() => {
      const deltaTime = this._engine.getDeltaTime() / 1000;
      cameraContainer.locallyTranslate(
        new Vector3(
          camHorizontal * camSpd * deltaTime,
          0,
          camVertical * camSpd * deltaTime
        )
      );

      // Keep camera container aligned with character position
      cameraContainer.position.x = this.characterBox.position.x;
      cameraContainer.position.z = this.characterBox.position.z;

      if (this.isMoving && this.ourTargetPos !== undefined) {
        const distance = this.calculateDistance(
          this.ourTargetPos,
          this.characterBox.position
        );
        // console.log(distance);
        if (this.targetName === "ground")
          if (distance < 0.1) return this.Stop();
        if (this.targetName === "tree")
          if (distance < 1) return this.InitializeAttack();
        if (this.targetName.includes("enemy"))
          if (distance <= 2) return this.InitializeAttack();

        this.characterBox.locallyTranslate(
          new Vector3(0, 0, this.characterSpeed * deltaTime)
        );
      }

      this.enemies.forEach((enemy) => {
        const distance = this.calculateDistance(
          enemy.mesh.position,
          this.characterBox.position
        );

        if (distance <= 4 && distance > 1) {
          // Start chasing if within 4 units but greater than 1 unit distance
          enemy.moving = true;
        }

        if (enemy.moving) {
          if (distance >= 10 || distance < 1) {
            // Stop chasing if distance is greater than 10 or less than 1
            enemy.moving = false;
            enemy.anims.forEach(
              (anim) => anim.name === "running" && anim.stop()
            );
            enemy.anims.forEach(
              (anim) => anim.name === "0Idle" && anim.play(true)
            );
          } else {
            // Move towards the character and play the running animation
            enemy.mesh.lookAt(this.characterBox.position);
            enemy.mesh.locallyTranslate(
              new Vector3(0, 0, enemy.spd * deltaTime)
            );
            enemy.anims.forEach(
              (anim) => anim.name === "running" && anim.play()
            );
          }
        }
      });
    });

    let currentEnemyTarget = null; // Tracks the last targeted enemy
    scene.onPointerDown = (e) => {
      if (this.GAMEOVER) return;
      if (e.buttons === 1) {
        const pickInfo = scene.pick(scene.pointerX, scene.pointerY);
        if (!pickInfo.hit) return;

        // Ensure runningSound is initialized before stopping it
        if (this.runningSound && this.runningSound.isPlaying) {
          this.runningSound.stop();
        }

        this.targetName = pickInfo.pickedMesh.name;
        this.targetId = pickInfo.pickedMesh.id;

        pickInfo.pickedPoint.y = this.characterBox.position.y;
        this.ourTargetPos = pickInfo.pickedPoint;
        const distance = this.calculateDistance(
          this.ourTargetPos,
          this.characterBox.position
        );
        if (this.targetName === "ground") {
          currentEnemyTarget = null; // Reset target when ground is clicked
          if (distance < 0.1) return console.log("we are near on our target");
          this.Move(this.ourTargetPos);
        }
        if (this.targetName === "tree") {
          if (distance < 1) return this.InitializeAttack();
          this.Move(this.ourTargetPos);
        }
        if (this.targetName.includes("enemy")) {
          // Check if the clicked enemy is the same as the current target
          if (currentEnemyTarget === this.targetName) {
            return; // Do nothing if it's the same enemy
          }

          currentEnemyTarget = this.targetName; // Update target if it's a different enemy
          if (distance < 1) return this.InitializeAttack();
          this.Move(this.ourTargetPos);
        }
      }
    };

    //--Transition post process--
    scene.registerBeforeRender(() => {
      if (this._ui.transition) {
        this._ui.fadeLevel -= 0.05;

        //once the fade transition has complete, switch scenes
        if (this._ui.fadeLevel <= 0) {
          this._ui.quit = true;
          this._ui.transition = false;
        }
      }
    });

    //--GAME LOOP--
    scene.onBeforeRenderObservable.add(() => {
      if (!this._ui.gamePaused) {
        this._ui.updateHud();
      }
    });
  }
}
new App();
