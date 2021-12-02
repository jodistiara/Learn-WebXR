import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/jsm/OrbitControls.js';

class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );

		// camera creation; using perspective camera so that the object will be closer
        this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth/window.innerHeight, 0.1, 100); 
		this.camera.position.set( 0,0,4); // by default the camera is in 0,0,0
		
		// scene creation
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0xaaaaaa ); // by default the bg color is white (using hex)
		
		// add light so that the object's color will show
		const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3);
		this.scene.add( ambient );

		// add directional light
		const light = new THREE.DirectionalLight();
		light.position.set( 0.2, 1, 1);
		this.scene.add(light);

		// essentials things to set on the renderer
		this.renderer = new THREE.WebGLRenderer( {antialias: true} );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		container.appendChild( this.renderer.domElement ); // to ensure the dom is visible in the container

		this.renderer.setAnimationLoop( this.render.bind(this) ); // called up to 60x in a second

		const geometry = new THREE.BoxBufferGeometry(); // box creation
		const material = new THREE.MeshStandardMaterial( {color:0xff0000}); // material color

		this.mesh = new THREE.Mesh( geometry, material );

		this.scene.add( this.mesh );

		//add mouse control
		const controls = new OrbitControls( this.camera, this.renderer.domElement);
		
        window.addEventListener('resize', this.resize.bind(this) );
	}	
    
	// adding event when the window is resized
    resize(){
        this.camera.aspect = window.innerWidth/window.innerHeight; // update the camera ratio
		this.camera.updateProjectionMatrix(); // update the projection matrix based on camera ratio
		this.renderer.setSize( window.innerWidth, window.innerHeight ); // adjusting the renderer size
    }
    
	render( ) {  
		this.mesh.rotateY( 0.01 );
        this.renderer.render( this.scene, this.camera);
    }
}

export { App };