import { Scene, Vector3, TransformNode, Mesh, UniversalCamera, AnimationGroup, Sound, Observable, ShadowGenerator } from "@babylonjs/core";
import { PlayerInput } from "./inputController";

export class Player extends TransformNode {
    public camera: UniversalCamera;
    public scene: Scene;
    private _input: PlayerInput;

    // Player
    public mesh: Mesh; // outer collisionbox of player

    // Camera
    private _camRoot: TransformNode;
    private _yTilt: TransformNode;

    // Animations
    private _run: AnimationGroup;
    private _idle: AnimationGroup;

    // Movement states
    private _moveDirection: Vector3 = new Vector3();
    private _isMoving: boolean = false;
    private _isAttacking: boolean = false;
    private _targetName: string;
    private _currentTarget: string | null = null; // Tracks the current enemy target
    private _ourTargetPos: Vector3;

    // Sounds
    private _runningSound: Sound;
    private _attackingSound: Sound

    // Observables
    public onRun = new Observable();

    constructor(assets, scene: Scene, input?: PlayerInput) {
        super("player", scene);
        this.scene = scene;

        // Initialize components
        this._setupPlayerCamera();
        this.mesh = assets.mesh;
        this.mesh.parent = this;
        this._idle = assets.animationGroups[0];
        this._run = assets.animationGroups[32];


        this._input = input;

        // Register pointer events
        this._registerPointerEvents();

        this.scene.onBeforeRenderObservable.add(() => {
            const deltaTime = this.scene.getEngine().getDeltaTime() / 1000; // in seconds
            this.updateMovement(deltaTime);
        });
        
    }

    private _loadSounds(scene:Scene): void {
        this._runningSound = new Sound(
            "runningSound",
            "/sounds/running.wav",
            scene,
            null,
            {
              loop: false,
              autoplay: false,
              volume: 0.5,
            }
          );
      
          this._attackingSound = new Sound(
            "slashSound",
            "/sounds/singleswordSlash.wav",
            scene,
            null,
            {
              loop: false,
              autoplay: false,
              volume: 0.2,
            }
          );
      
    }

    // -- Event Handlers --
    private _registerPointerEvents(): void {
        this.scene.onPointerDown = (e) => {
            console.log("Pointer down event triggered.");
            if (e.buttons !== 1) return; // Only handle left mouse button
            const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
            if (!pickInfo?.hit) {
                console.log("No hit detected.");
                return;
            }
    
            this._targetName = pickInfo.pickedMesh?.name || "";
            this._ourTargetPos = pickInfo.pickedPoint;
            if (this._ourTargetPos) this._ourTargetPos.y = this.mesh.position.y; // Align target position with player height
            console.log("Picked Point:", pickInfo.pickedPoint);
            console.log("Picked Mesh:", pickInfo.pickedMesh?.name);
            
            const distance = this._calculateDistance(this._ourTargetPos, this.mesh.position);
    
            if (this._targetName === "ground") {
                this._currentTarget = null; // Reset target when ground is clicked
                if (distance < 0.1) return;
    
                // Update with correct deltaTime
                const deltaTime = this.scene.getEngine().getDeltaTime() / 1000; // in seconds
                this.updateMovement(deltaTime);
            } else if (this._targetName === "tree") {
                if (distance < 1) return this._initializeAttack(this._ourTargetPos);
                this._moveTo(this._ourTargetPos);
            } else if (this._targetName.includes("enemy")) {
                if (this._currentTarget === this._targetName) return; // Do nothing if targeting the same enemy
                this._currentTarget = this._targetName;
                if (distance < 1) return this._initializeAttack(this._ourTargetPos);
                this._moveTo(this._ourTargetPos);
            }
        };
    }
    // -- Movement Logic --
private _moveTo(targetPos: Vector3): void {
    this._isMoving = true; // Player is now moving
    this._isAttacking = false; // Ensure player is not attacking when moving

    // Make the player look at the target position
    const { x, z } = targetPos;
    console.log("Before lookAt, rotation:", this.mesh.rotation);
    this.mesh.lookAt(new Vector3(x, this.mesh.position.y, z));
    console.log("After lookAt, rotation:", this.mesh.rotation);
    
    console.log("Mesh Parent Transform:", this.mesh.parent);


    // Safeguard for animations: Stop idle and run animations if needed
    if (this._idle) {
        this._idle.stop();
    } else {
        console.warn("Idle animation not defined.");
    }

    if (this._run) {
        this._run.play(true);
    } else {
        console.warn("Run animation not defined.");
    }

    // // Play walking sound effect if defined
    // if (this._walkingSfx) {
    //     this._walkingSfx.play();
    // } else {
    //     console.warn("Walking sound effect not defined.");
    // }
}

    

    private _calculateDistance(targetPos: Vector3, ourPos: Vector3): number {
        return Vector3.Distance(targetPos, ourPos);
    }

    // -- Movement Logic --
    public updateMovement(deltaTime: number): void {
        if (this._isMoving && this._ourTargetPos) {
            const distance = this._calculateDistance(this._ourTargetPos, this.mesh.position);
            if (this._targetName === "ground" && distance < 0.1) {
                this._stop(); // Stop moving if close enough to the ground target
            }
            if (this._targetName === "tree" && distance < 1) {
                this._initializeAttack(this._ourTargetPos); // Start attack if close to the tree
            }
            if (this._targetName.includes("enemy") && distance <= 2) {
                this._initializeAttack(this._ourTargetPos); // Start attack if close to the enemy
            }

            // Move the player towards the target position
            this.mesh.position = Vector3.Lerp(this.mesh.position, this._ourTargetPos, 0.5 * deltaTime);
            // Smooth movement
        }
        const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (!pickInfo?.hit) {
            console.log("No hit detected.");
            return;
        }
    }

    // -- Attack Logic --
    private _initializeAttack(targetPos: Vector3): void {
        if (this._isAttacking) return; // Already attacking

        this._isMoving = false;
        this._isAttacking = true;

        const { x, z } = targetPos;
        this.mesh.lookAt(new Vector3(x, this.mesh.position.y, z));

        this._run.stop();
        this._idle.stop();
        // Play attack animation and handle damage logic...
    }

    // -- Camera Setup --
    private _setupPlayerCamera(): UniversalCamera {
        this._camRoot = new TransformNode("root");
        this._camRoot.position = new Vector3(0, 0, 0);
        this._camRoot.rotation = new Vector3(0, Math.PI, 0);

        const yTilt = new TransformNode("ytilt");
        yTilt.rotation = new Vector3(0.5934119456780721, 0, 0);
        yTilt.parent = this._camRoot;
        this._yTilt = yTilt;

        this.camera = new UniversalCamera("cam", new Vector3(0, 0, -30), this.scene);
        this.camera.lockedTarget = this._camRoot.position;
        this.camera.parent = yTilt;
        this.scene.activeCamera = this.camera;

        return this.camera;
    }

    // -- Stop Movement --
    private _stop(): void {
        this._isMoving = false;
        this._idle.play(true);
        this._run.stop();
        // this._walkingSfx.stop();
        this._ourTargetPos = undefined;
    }
}
