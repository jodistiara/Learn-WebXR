
import * as THREE from '../../libs/three/three.module.js';
import { GLTFLoader } from '../../libs/three/jsm/GLTFLoader.js';
import { DRACOLoader } from '../../libs/three/jsm/DRACOLoader.js';
import { RGBELoader } from '../../libs/three/jsm/RGBELoader.js';
import { Stats } from '../../libs/stats.module.js';
import { LoadingBar } from '../../libs/LoadingBar.js';
import { VRButton } from '../../libs/VRButton.js';
import { CanvasUI } from '../../libs/CanvasUI.js';
import { JoyStick } from '../../libs/Toon3D.js';
import { XRControllerModelFactory } from '../../libs/three/jsm/XRControllerModelFactory.js';

class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );

		this.assetsPath = '../../assets/';
        
		this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 500 );
		this.camera.position.set( 0, 1.6, 0 );
        
        this.dolly = new THREE.Object3D(  );
        this.dolly.position.set(0, 0, 10);
        this.dolly.add( this.camera );
        this.dummyCam = new THREE.Object3D();
        this.camera.add( this.dummyCam );
        
		this.scene = new THREE.Scene();
        this.scene.add( this.dolly );
        
		const ambient = new THREE.HemisphereLight(0xFFFFFF, 0xAAAAAA, 0.8);
		this.scene.add(ambient);
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( this.renderer.domElement );
        // this.setEnvironment();
	
        window.addEventListener( 'resize', this.resize.bind(this) );
        
        this.clock = new THREE.Clock();
        this.raycaster = new THREE.Raycaster();
        
        this.stats = new Stats();
		container.appendChild( this.stats.dom );
        
        this.r = 50;
        this.area = [];
        const colors = [0xB3D6B8, 0x987DBF, 0x27A188, 
                  0xAFEEE6, 0xAAAA22, 0xB3D6B8,
                  0x6E8D5A, 0x6CC679, 0x228F02];

        for (let x=-150; x<=50; x+=(this.r * 2)){
            for (let z=-150; z<=50; z+=(this.r * 2)){
                this.area.push({
                    min_x: x,
                    max_x: x + (this.r * 2),
                    min_z: z,
                    max_z: z + (this.r * 2),
                    pos: new THREE.Vector3(x + this.r,0,z + this.r),
                    color: colors.pop(),
                    visible: false
                })
            }
        };
        
        this.initScene();
        this.setupXR();
        
	}
	
    setEnvironment(){
        const loader = new RGBELoader().setDataType( THREE.UnsignedByteType );
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();
        
        const self = this;
        
        loader.load( '../../assets/hdr/venice_sunset_1k.hdr', ( texture ) => {
          const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
          pmremGenerator.dispose();

          self.scene.environment = envMap;

        }, undefined, (err)=>{
            console.error( 'An error occurred setting the environment');
        } );
    }
    
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }
    
    initScene(){

		this.scene.background = new THREE.Color( 0xa0a0a0 );
		this.scene.fog = new THREE.Fog( 0xa0a0a0, 50, 100 );

		// ground
		const ground = new THREE.Mesh( new THREE.PlaneBufferGeometry( 200, 200 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
		ground.rotation.x = - Math.PI / 2;
		this.scene.add( ground );

		var grid = new THREE.GridHelper( 200, 40, 0x000000, 0x000000 );
		grid.material.opacity = 0.2;
		grid.material.transparent = true;
		this.scene.add( grid );

        this.colliders = [];
        
        this.geometry = new THREE.BoxGeometry(5, 5, 5);
        
        const edges = new THREE.EdgesGeometry( this.geometry );
        this.line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 2 } ) );
        
        this.dolly = new THREE.Object3D(); // an object to move the camera in the scene
        this.dolly.position.z = 5;
        this.dolly.add( this.camera );
        this.scene.add( this.dolly );

        this.dummyCam = new THREE.Object3D();
        this.camera.add( this.dummyCam );
        
    } 

    createBoxes(min_x, max_x, min_z, max_z, color){ 
        this.group = new THREE.Group();
        const material = new THREE.MeshPhongMaterial({ color:color });

        for (let x=min_x; x<max_x; x+=10){
            for (let z=min_z; z<max_z; z+=10){
                if (x==0 && z==0) continue; // to remove the box where we stand at first
                const box = new THREE.Mesh(this.geometry, material);
                box.position.set(x, 2.5, z);

                const edge = this.line.clone();
                edge.position.copy( box.position );
                this.group.add(box);
                this.group.add(edge);

                this.colliders.push(box);
            }
        }
        this.scene.add( this.group );     
    }

    onMove( forward, turn){
        if (this.dolly){
            this.dolly.userData.forward = forward;
            this.dolly.userData.turn = -turn;
        }
    }

    setupXR(){
        this.renderer.xr.enabled = true;

        const self = this;

        function vrStatus( available ){ // to decide if XR is available
            if ( available ){ // if XR available
                function onSelectStart( event ) {

                    this.userData.selectPressed = true;

                }

                function onSelectEnd( event ) {

                    this.userData.selectPressed = false;

                }

                self.controllers = self.buildControllers( self.dolly );

                self.controllers.forEach( ( controller ) =>{
                    controller.addEventListener( 'selectstart', onSelectStart );
                    controller.addEventListener( 'selectend', onSelectEnd );
                });
            }else{ // if not available
                self.joystick = new JoyStick({
                    onMove: self.onMove.bind( self )
                })
            }
        }
        
        const btn = new VRButton( this.renderer , { vrStatus }); // add the vrStatus callback 
        
        this.renderer.setAnimationLoop( this.render.bind(this) );
    }
    
    buildControllers( parent = this.scene ){
        const controllerModelFactory = new XRControllerModelFactory();

        const geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -1 ) ] );

        const line = new THREE.Line( geometry );
        line.scale.z = 0;
        
        const controllers = [];
        
        for(let i=0; i<=1; i++){
            const controller = this.renderer.xr.getController( i );
            controller.add( line.clone() );
            controller.userData.selectPressed = false;
            parent.add( controller );
            controllers.push( controller );
            
            const grip = this.renderer.xr.getControllerGrip( i );
            grip.add( controllerModelFactory.createControllerModel( grip ) );
            parent.add( grip );
        }
        
        return controllers;
    }
    
    moveDolly(dt){
        // if (this.proxy === undefined) return;
        
        const wallLimit = 1.3;
        const speed = 2;
		let pos = this.dolly.position.clone();
        pos.y += 1;
        
		let dir = new THREE.Vector3();
        
        if (this.joystick!==undefined){    
            //Store original dolly rotation
            const quaternion = this.dolly.quaternion.clone();
            //Get rotation for movement from the headset pose
            this.dolly.quaternion.copy( this.dummyCam.getWorldQuaternion() );
            this.dolly.getWorldDirection(dir);
            dir.negate();
        }else{
            this.dolly.getWorldDirection(dir);
            if (this.dolly.userData.forward > 0){
                dir.negate();
            }else{
                dt = -dt;
            }
        }
  		this.raycaster.set(pos, dir);
		
        let blocked = false;
		
        let intersect = this.raycaster.intersectObjects( this.colliders );
        if (intersect.length>0){
            if (intersect[0].distance < wallLimit) blocked = true;
        }
		
		if (!blocked){
            this.dolly.translateZ(-dt*speed);
		}

        //Restore the original rotation
        if (this.joystick === undefined) this.dolly.quaternion.copy( quaternion );
	}
		
    get selectPressed(){
        return ( this.controllers !== undefined && (this.controllers[0].userData.selectPressed || this.controllers[1].userData.selectPressed) );    
    }

	render( timestamp, frame ){
        const dt = this.clock.getDelta();
        
        let moved = false;

        if (this.renderer.xr.isPresenting && this.selectPressed){
            this.moveDolly(dt);
            moved = true;
        }
        
        if (this.joystick !== undefined){
            if (this.dolly.userData.forward !== undefined){
                if (this.dolly.userData.forward != 0){
                    this.moveDolly(dt);
                    moved = true;
                }
                this.dolly.rotateY( this.dolly.userData.turn*dt );
            }
        }
        
        const dollyPos = this.dolly.getWorldPosition( new THREE.Vector3() );
        const distanceLimit = this.r * 1.5;

        // console.log( dollyPos );

        if (moved) {
            this.area.forEach( (obj) => {
                const distance = obj.pos.distanceTo( dollyPos );
                // console.log(obj.pos, distance)
                if (!obj.visible && distance > distanceLimit) return;
                if (obj.visible && distance <= distanceLimit) return;
                if (obj.visible) {
                    const selectedObj = this.scene.getObjectById(obj.id);
                    this.scene.remove( selectedObj );

                    obj.visible = false;
                    obj.id = "";
                    return;
                } else {
                    this.createBoxes(
                        obj.min_x,
                        obj.max_x,
                        obj.min_z,
                        obj.max_z,
                        obj.color
                    );
                    obj.id = this.group.id;
                    obj.visible = true;
                };
            });  
        };
        this.stats.update();
		this.renderer.render(this.scene, this.camera);
        
	}
}

export { App };
