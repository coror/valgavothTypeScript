import { Scene, TransformNode, Sound, SceneLoader, Color3, Vector3, StandardMaterial, Animation, QuadraticEase, QuarticEase } from "@babylonjs/core";
import { PlayerInput } from "./inputController";

export class Player extends TransformNode {
  public scene: Scene;

  // Sounds
  private _runningSound: Sound;
  private _attackingSound: Sound;

  // Animations
  private _idleAnimation;
  private _attackingAnimation;
  private _runningAnimation;
  private _dying;

  constructor(assets, scene: Scene, input?: PlayerInput) {
    super("player", scene);
    this.scene = scene;

    const animation = assets.animationGroups;

    this._idleAnimation = animation.find(
      (animation) => animation.name === "0Idle"
    );
    this._attackingAnimation = animation.find(
      (animation) => animation.name === "slash.0"
    );
    this._runningAnimation = animation.find(
      (animation) => animation.name === "running.weapon"
    );

    // Initialize components
    this._loadSounds(this.scene);
  }

  private _loadSounds(scene: Scene): void {
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

  public get idleAnimation() {
    return this._idleAnimation;
  }

  public get attackAnimation() {
    return this._attackingAnimation;
  }

  public get runningAnimation() {
    return this._runningAnimation;
  }

  public get runningSound(): Sound {
    return this._runningSound;
  }

  public get attackingSound(): Sound {
    return this._attackingSound;
  }

  
}
