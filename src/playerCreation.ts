import {
  Scene,
  TransformNode,
  Sound,
  SceneLoader,
  Color3,
  Vector3,
  StandardMaterial,
  Animation,
  QuadraticEase,
  QuarticEase,
} from "@babylonjs/core";
import { PlayerInput } from "./inputController";

export default async function createCharacter(
  scene,
  camera,
  canvas,
  onPlayCallBack: () => void
): Promise<void> {
  const characterCreationUI = document.getElementsByClassName(
    "character-creation"
  )[0] as HTMLElement;
  characterCreationUI.style.display = "block";

  const characterModel = await SceneLoader.ImportMeshAsync(
    "",
    "/models/",
    "gameCharac.glb",
    scene
  );

  // Object to store equipped items
  const equippedItems = {
    armor: null,
    boots: null,
    cloth: null,
    hair: null,
    hairColor: new Color3(0, 0, 0),
    gear: null,
    pants: null,
    body: null,
    ear: null,
    weapon: null,
    shield: null,
    characterName: "",
  };

  characterModel.meshes.forEach((mesh) => {
    if (mesh.name !== "bodyp") mesh.isVisible = false;
  });

  characterModel.meshes[0].addRotation(0, Math.PI, 0);

  camera.setTarget(new Vector3(0, 1, 0));

  // Function to handle dropdown selection
  const handleDropdownChange = (dropdownId: string) => {
    const dropdown = document.getElementById(dropdownId) as HTMLSelectElement;
    const selectedItem = dropdown.value;

    // Identify the category (armor, boots, etc.)
    const category = dropdownId.split("-")[1]; // e.g., "cloth" from "select-cloth"

    // Hide the previously equipped item in the same category, if any
    if (equippedItems[category]) {
      const previousMesh = characterModel.meshes.find(
        (mesh) => mesh.name === equippedItems[category]
      );
      if (previousMesh) {
        previousMesh.isVisible = false; // Hide previous item
      }
    }

    // Show the newly selected mesh
    if (selectedItem) {
      const newMesh = characterModel.meshes.find(
        (mesh) => mesh.name === selectedItem
      );
      if (newMesh) {
        newMesh.isVisible = true; // Show new item
        equippedItems[category] = selectedItem; // Update equipped item

        // If the category is hair, apply the stored hair color
        if (category === "hair") {
          changeHairColor(equippedItems.hairColor.toHexString());
        }
      }
    }
  };

  // WEAPON MODELS

  // Load all sword models
  const swordModels = await SceneLoader.ImportMeshAsync(
    "",
    "/models/",
    "swords.glb",
    scene
  );

  // Hide all swords initially
  swordModels.meshes.forEach((mesh) => {
    mesh.visibility = 0;
  });

  // Function to handle dropdown selection
  const handleWeaponDropdownChange = (dropdownId: string) => {
    const dropdown = document.getElementById(dropdownId) as HTMLSelectElement;
    const selectedItem = dropdown.value;

    // Hide previously equipped sword
    if (equippedItems.weapon) {
      swordModels.meshes.forEach((mesh) => {
        if (mesh.name.startsWith(equippedItems.weapon)) {
          mesh.visibility = 0;
        }
      });
    }

    if (selectedItem) {
      swordModels.meshes.forEach((mesh) => {
        if (mesh.name.startsWith(selectedItem)) {
          mesh.visibility = 1;
        }
      });
      equippedItems.weapon = selectedItem;
    }
  };

  const rightHandBone = characterModel.skeletons[0].bones.find(
    (bone) => bone.name === "hand.R"
  );
  let swordHolder;
  if (rightHandBone) {
    // Create a holder node to position the sword
    swordHolder = new TransformNode("swordHolder", scene);

    // Attach the swordHolder to the hand bone
    rightHandBone.getTransformNode().addChild(swordHolder);

    // Set the sword holder's position and rotation to align with the hand
    swordHolder.position = new Vector3(0, 0.5, 0);
    swordHolder.rotation = new Vector3(0, 0, Math.PI / 2);

    // Attach and adjust each part of the sword mesh
    swordModels.meshes.forEach((swordMesh) => {
      swordMesh.parent = swordHolder;
      swordMesh.isVisible = true; // Make the equipped sword part visible
      swordMesh.scaling = new Vector3(0.1, 0.1, 0.1); // Scale down if needed
      swordMesh.position = new Vector3(0, 0, 0);
      swordMesh.rotation = new Vector3(Math.PI / 2, 0, 0); // Adjust based on hand orientation
    });
  } else {
    console.log("Hand bone not found!");
  }

  // Load all shield models
  const shieldModels = await SceneLoader.ImportMeshAsync(
    "",
    "/models/",
    "shields.glb",
    scene
  );

  // Hide all shields initialyl
  shieldModels.meshes.forEach((mesh) => (mesh.visibility = 0));
  // Function to handle shield dropdown selection
  const handleShieldDropdownChange = (dropdownId: string) => {
    const dropdown = document.getElementById(dropdownId) as HTMLSelectElement;
    const selectedItem = dropdown.value;

    // hide prev equipped shield
    if (equippedItems.shield) {
      shieldModels.meshes.forEach((mesh) => {
        if (mesh.name.startsWith(equippedItems.shield)) {
          mesh.visibility = 0;
        }
      });
    }

    if (selectedItem) {
      shieldModels.meshes.forEach((mesh) => {
        if (mesh.name.startsWith(selectedItem)) {
          mesh.visibility = 1;
        }
      });
      equippedItems.shield = selectedItem;
    }
  };

  const leftHandBone = characterModel.skeletons[0].bones.find(
    (bone) => bone.name === "hand.L"
  );
  let shieldHolder;
  if (leftHandBone) {
    shieldHolder = new TransformNode("shieldHolder", scene);

    leftHandBone.getTransformNode().addChild(shieldHolder);

    shieldHolder.position = new Vector3(0, 0, 0);
    shieldHolder.rotation = new Vector3(0, 0, 0);

    shieldModels.meshes.forEach((shieldMesh) => {
      shieldMesh.parent = shieldHolder;
      shieldMesh.isVisible = true;
      shieldMesh.scaling = new Vector3(0.2, 0.2, 0.2);
      shieldMesh.position = new Vector3(0.03, 0.1, 0);
      shieldMesh.rotation = new Vector3(0, 0, 0);
    });
  } else {
    console.log("Hand bone not found!");
  }

  const changeHairColor = (color) => {
    const hairMesh = characterModel.meshes.find(
      (mesh) => mesh.name === equippedItems.hair
    );

    if (hairMesh) {
      // Ensure the material is StandardMaterial
      let material = hairMesh.material as StandardMaterial;

      if (!(material instanceof StandardMaterial)) {
        material = new StandardMaterial("hairMaterial", scene);
        hairMesh.material = material;
      }

      // Apply color to material
      material.diffuseColor = Color3.FromHexString(color);
      material.specularColor = new Color3(0, 0, 0);
      material.emissiveColor = new Color3(0, 0, 0);

      equippedItems.hairColor = material.diffuseColor;
    } else {
      console.log("Hair mesh not found.");
    }
  };

  document
    .getElementById("hairColorPicker")
    .addEventListener("input", (event) => {
      const inputElement = event.target as HTMLInputElement;
      changeHairColor(inputElement.value);
    });

  // Set initial selection for pants
  const defaultPants = "pants.brown";
  const pantsDropdown = document.getElementById(
    "select-pants"
  ) as HTMLSelectElement;
  pantsDropdown.value = defaultPants;
  handleDropdownChange("select-pants"); // Call the function to update visibility
  // Store initial camera settings
  const initialCameraSettings = {
    target: new Vector3(0, 1, 0), // Adjust to your model's center
    alpha: camera.alpha,
    beta: (camera.beta = Math.PI / 2),
    radius: camera.radius,
  };

  // Function to create a smooth zoom transition with optional rotation
  function smoothZoom(
    targetPosition,
    targetRadius,
    targetAlpha = Math.PI / 2,
    duration = 90
  ) {
    camera.detachControl();
    // Create animations for the reset position
    const resetRadiusAnimation = new Animation(
      "resetRadiusAnimation",
      "radius",
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    resetRadiusAnimation.setKeys([
      { frame: 0, value: camera.radius },
      { frame: duration, value: initialCameraSettings.radius },
    ]);

    const resetTargetAnimation = new Animation(
      "resetTargetAnimation",
      "target",
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    resetTargetAnimation.setKeys([
      { frame: 0, value: camera.target },
      { frame: duration, value: initialCameraSettings.target },
    ]);

    const resetAlphaAnimation = new Animation(
      "resetAlphaAnimation",
      "alpha",
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    resetAlphaAnimation.setKeys([
      { frame: 0, value: camera.alpha },
      { frame: duration, value: initialCameraSettings.alpha },
    ]);

    const resetBetaAnimation = new Animation(
      "resetBetaAnimation",
      "beta",
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    resetBetaAnimation.setKeys([
      { frame: 0, value: camera.beta },
      { frame: duration, value: Math.PI / 2 },
    ]);

    // Easing function for smoothness
    const easingFunction = new QuarticEase();
    easingFunction.setEasingMode(QuadraticEase.EASINGMODE_EASEINOUT);
    resetRadiusAnimation.setEasingFunction(easingFunction);
    resetTargetAnimation.setEasingFunction(easingFunction);
    resetAlphaAnimation.setEasingFunction(easingFunction);
    resetBetaAnimation.setEasingFunction(easingFunction);

    // Start reset animations
    camera.animations = [
      resetRadiusAnimation,
      resetTargetAnimation,
      resetAlphaAnimation,
      resetBetaAnimation,
    ];
    scene.beginAnimation(camera, 0, duration, false, 1, () => {
      // After reset animation completes, start zooming to the new target
      const radiusAnimation = new Animation(
        "radiusAnimation",
        "radius",
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      radiusAnimation.setKeys([
        { frame: 0, value: camera.radius },
        { frame: duration, value: targetRadius },
      ]);

      const targetAnimation = new Animation(
        "targetAnimation",
        "target",
        60,
        Animation.ANIMATIONTYPE_VECTOR3,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      targetAnimation.setKeys([
        { frame: 0, value: camera.target },
        { frame: duration, value: targetPosition },
      ]);

      const alphaAnimation = new Animation(
        "alphaAnimation",
        "alpha",
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      alphaAnimation.setKeys([
        { frame: 0, value: camera.alpha },
        { frame: duration, value: targetAlpha },
      ]);

      // Add easing for zoom animations
      radiusAnimation.setEasingFunction(easingFunction);
      targetAnimation.setEasingFunction(easingFunction);
      alphaAnimation.setEasingFunction(easingFunction);

      // Start the zoom animations
      camera.animations = [radiusAnimation, targetAnimation, alphaAnimation];
      scene.beginAnimation(camera, 0, duration, false);
    });
  }

  type ZoomPosition = {
    position: Vector3;
    radius: number;
    targetAlpha?: number; // Make targetAlpha optional
  };

  // Set zoom positions for each category
  const zoomPositions: { [key: string]: ZoomPosition } = {
    fullBody: {
      position: initialCameraSettings.target,
      radius: initialCameraSettings.radius,
    },
    hair: { position: new Vector3(0, 1.4, 0), radius: 1 },
    cloth: { position: new Vector3(0, 1, 0), radius: 1.5 },
    pants: { position: new Vector3(0, 0.5, 0), radius: 1.8 },
    boots: { position: new Vector3(0, 0, 0), radius: 2 },
    gear: { position: new Vector3(0, 1, 0), radius: 1.5 },
    armor: { position: new Vector3(0, 1, 0), radius: 1.5 },
    weapon: {
      position: new Vector3(0.3, 1, 0),
      radius: 1.5,
      targetAlpha: -Math.PI / 8,
    },
    shield: {
      position: new Vector3(-1, 1, 0),
      radius: 1.5,
      targetAlpha: Math.PI,
    },
  };

  function attachDropdownListener(
    dropdownId: string,
    handler: (id: string) => void
  ) {
    const dropdown = document.getElementById(dropdownId) as HTMLSelectElement;
    if (dropdown) {
      dropdown.addEventListener("change", () => handler(dropdownId));
    }
  }

  const dropdowns = [
    "select-hair",
    "select-cloth",
    "select-pants",
    "select-boots",
    "select-gear",
    "select-armor",
    "select-weapon",
    "select-shield",
  ];

  dropdowns.forEach((dropdownId) =>
    attachDropdownListener(dropdownId, handleDropdownChange)
  );

  document
    .getElementById("select-weapon")
    .addEventListener("change", () =>
      handleWeaponDropdownChange("select-weapon")
    );

  document
    .getElementById("select-shield")
    .addEventListener("change", () =>
      handleShieldDropdownChange("select-shield")
    );

  // Efficient zoom handler
  const zoomParams = {
    "zoom-hair": zoomPositions.hair,
    "zoom-cloth": zoomPositions.cloth,
    "zoom-pants": zoomPositions.pants,
    "zoom-boots": zoomPositions.boots,
    "zoom-gear": zoomPositions.gear,
    "zoom-armor": zoomPositions.armor,
    "zoom-weapon": zoomPositions.weapon,
    "zoom-shield": zoomPositions.shield,
  };

  Object.entries(zoomParams).forEach(
    ([buttonId, { position, radius, targetAlpha }]) => {
      document.getElementById(buttonId)?.addEventListener("click", () => {
        smoothZoom(position, radius, targetAlpha);
      });
    }
  );

  // Add event listeners for zoom buttons
  document.getElementById("reset-camera").addEventListener("click", () => {
    smoothZoom(zoomPositions.fullBody.position, zoomPositions.fullBody.radius);
    camera.attachControl(canvas, true);
  });

  document
    .getElementById("select-hair")
    .addEventListener("change", () => handleDropdownChange("select-hair"));
  document
    .getElementById("select-cloth")
    .addEventListener("change", () => handleDropdownChange("select-cloth"));
  document
    .getElementById("select-pants")
    .addEventListener("change", () => handleDropdownChange("select-pants"));
  document
    .getElementById("select-boots")
    .addEventListener("change", () => handleDropdownChange("select-boots"));
  document
    .getElementById("select-gear")
    .addEventListener("change", () => handleDropdownChange("select-gear"));
  document
    .getElementById("select-armor")
    .addEventListener("change", () => handleDropdownChange("select-armor"));
  document
    .getElementById("select-weapon")
    .addEventListener("change", () =>
      handleWeaponDropdownChange("select-weapon")
    );
  document
    .getElementById("select-shield")
    .addEventListener("change", () =>
      handleShieldDropdownChange("select-shield")
    );
  document.getElementById("char-name").addEventListener("change", (event) => {
    const inputElement = event.target as HTMLInputElement;
    const name = inputElement.value;
    equippedItems.characterName = name;
    console.log(equippedItems);
  });

  const playButton = document.getElementById("play");
  if (playButton) {
    playButton.addEventListener("click", () => {
      localStorage.setItem("Equipped items", JSON.stringify(equippedItems));

      const characterCreationUI = document.getElementsByClassName(
        "character-creation"
      )[0] as HTMLElement;
      characterCreationUI.style.display = "none";

      document.getElementById("char-name").addEventListener("change", () => {
        const input = event.target as HTMLInputElement;
        const name = input.value;
        equippedItems.characterName = name;
        console.log(equippedItems);
      });

      if (onPlayCallBack) {
        onPlayCallBack();
      }
    });
  }
}
