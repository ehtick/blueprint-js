import { Mesh, Box3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { EVENT_ITEM_LOADED, EVENT_ITEM_LOADING, EVENT_UPDATED } from "../core/events";
import { BoxBufferGeometry, LineBasicMaterial, LineSegments, EdgesGeometry } from "three/build/three.module";
import gsap from 'gsap';
import { BASE_TYPES, BASE_PARAMETRIC_TYPES } from "../parametrics/ParametricTypes";
import { DoorFactory } from "../parametrics/doors/DoorFactory";

export class Physical3DItem extends Mesh {
    constructor(itemModel) {
        super();
        this.__itemModel = itemModel;
        this.__box = null;
        this.__center = null;
        this.__size = null;
        this.__selected = false;

        this.__selectedMaterial = new LineBasicMaterial({ color: 0x0000F0, linewidth: 5 });

        this.__boxhelper = new LineSegments(new EdgesGeometry(new BoxBufferGeometry(1, 1, 1)), this.__selectedMaterial);


        this.__customIntersectionPlanes = []; // Useful for intersecting only wall planes, only floorplanes, only ceiling planes etc

        this.__gltfLoader = new GLTFLoader();
        this.__gltfLoadingProgressEvent = this.__gltfLoadingProgress.bind(this);
        this.__gltfLoadedEvent = this.__gltfLoaded.bind(this);
        this.__itemUpdatedEvent = this.__itemUpdated.bind(this);
        this.__itemModel.addEventListener(EVENT_UPDATED, this.__itemUpdatedEvent);
        this.add(this.__boxhelper);
        this.__boxhelper.material.linewidth = 5;
        this.selected = false;
        this.position.copy(this.__itemModel.position);
        if (this.__itemModel.isParametric) {
            this.__createParametricItem();
        } else {
            this.__loadItemModel();
        }

    }

    __itemUpdated(evt) {
        let scope = this;
        let duration = 0.15;

        function __tinyUpdate() {
            scope.parent.needsUpdate = true;
        }
        if (evt.property === 'position') {
            gsap.to(this.position, { duration: duration, x: this.__itemModel.position.x, onUpdate: __tinyUpdate });
            gsap.to(this.position, { duration: duration, y: this.__itemModel.position.y });
            gsap.to(this.position, { duration: duration, z: this.__itemModel.position.z });
        }
        if (evt.property === 'rotation') {
            gsap.to(this.__loadedItem.rotation, { duration: duration, x: this.__itemModel.rotation.x, onUpdate: __tinyUpdate });
            gsap.to(this.__loadedItem.rotation, { duration: duration, y: this.__itemModel.rotation.y });
            gsap.to(this.__loadedItem.rotation, { duration: duration, z: this.__itemModel.rotation.z });
            gsap.to(this.__boxhelper.rotation, { duration: duration, x: this.__itemModel.rotation.x });
            gsap.to(this.__boxhelper.rotation, { duration: duration, y: this.__itemModel.rotation.y });
            gsap.to(this.__boxhelper.rotation, { duration: duration, z: this.__itemModel.rotation.z });
        }
        if (evt.property === 'visible') {
            this.visible = this.__itemModel.visible;
        }
    }

    __initializeChildItem() {
        this.__box = new Box3().setFromObject(this.__loadedItem);
        this.__center = this.__box.getCenter(new Vector3());
        this.__size = this.__box.getSize(new Vector3());

        this.__boxhelper.geometry = new EdgesGeometry(new BoxBufferGeometry(this.__size.x, this.__size.y, this.__size.z));
        this.add(this.__loadedItem);

        this.geometry = new BoxBufferGeometry(this.__size.x, this.__size.y, this.__size.z, 1, 1, 1);
        this.geometry.computeBoundingBox();

        this.material.visible = false;
        this.__loadedItem.rotation.x = this.__itemModel.rotation.x;
        this.__loadedItem.rotation.y = this.__itemModel.rotation.y;
        this.__loadedItem.rotation.z = this.__itemModel.rotation.z;
        this.__boxhelper.rotation.x = this.__itemModel.rotation.x;
        this.__boxhelper.rotation.y = this.__itemModel.rotation.y;
        this.__boxhelper.rotation.z = this.__itemModel.rotation.z;
    }

    __loadItemModel() {
        if (!this.__itemModel.modelURL || this.__itemModel.modelURL === undefined || this.__itemModel.modelURL === 'undefined') {
            return;
        }

        if (this.__loadedItem) {
            this.remove(this.__loadedItem);
        }

        this.__gltfLoader.load(this.__itemModel.modelURL, this.__gltfLoadedEvent, this.__gltfLoadingProgressEvent);
    }

    __gltfLoaded(gltfModel) {
        this.__loadedItem = gltfModel.scene;
        this.__initializeChildItem();
        this.dispatchEvent({ type: EVENT_ITEM_LOADED });
    }

    __gltfLoadingProgress(xhr) {
        this.dispatchEvent({ type: EVENT_ITEM_LOADING, loaded: xhr.loaded, total: xhr.total, percent: (xhr.loaded / xhr.total) * 100, jsraw: xhr });
    }

    __createParametricItem() {
        let parametricData = null;
        console.log(this.__itemModel.baseParametricType, BASE_PARAMETRIC_TYPES.DOOR);
        switch (this.__itemModel.baseParametricType) {
            case BASE_PARAMETRIC_TYPES.DOOR:
                parametricData = new(DoorFactory.getClass(this.__itemModel.subParametricData.type))(this.__itemModel.subParametricData);
                break;
            default:
                throw new Error('Not Implemented Error');
        }
        if (parametricData) {
            console.log(parametricData.geometry, parametricData.material);
            this.__loadedItem = new Mesh(parametricData.geometry, parametricData.material);
            this.__initializeChildItem();
            this.dispatchEvent({ type: EVENT_ITEM_LOADED });
        }
    }

    dispose() {
        this.__itemModel.removeEventListener(EVENT_UPDATED, this.__itemUpdatedEvent);
        this.parent.remove(this);
    }

    snapToPoint(coordinate3d, normal, intersectingPlane) {
        this.__itemModel.snapToPoint(coordinate3d, normal, intersectingPlane);
    }

    get selected() {
        return this.__selected;
    }

    set selected(flag) {
        this.__selected = flag;
        this.__boxhelper.visible = flag;
    }

    set location(coordinate3d) {
        this.__itemModel.position = coordinate3d;
    }

    get location() {
        return this.__itemModel.position.clone();
    }

    get intersectionPlanes() {
        return this.__itemModel.intersectionPlanes;
    }
}