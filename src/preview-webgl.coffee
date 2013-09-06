
class PreviewWebGL
    constructor: (@container) ->
        @Init()

    Init: () =>
        @camera = new THREE.PerspectiveCamera( 35, 1, 1, 10000 );
        @camera.position.z = 900;

        @scene = new THREE.Scene();

        ambientLight = new THREE.AmbientLight( 0x222222 );
        @scene.add( ambientLight );

        directionalLight = new THREE.DirectionalLight( 0xffeedd, 1 );
        directionalLight.position.set( 1, -1, 1 ).normalize();
        @scene.add( directionalLight );

        @sphereMaterial = new THREE.MeshLambertMaterial({color:0xCC0000})

        @sphere = new THREE.Mesh(
            new THREE.SphereGeometry(150,32,32),
            @sphereMaterial
        )

        @scene.add(@sphere)

        @renderer = new THREE.WebGLRenderer( { antialias: false } );
        @renderer.setSize( 512, 512 );
        @renderer.setClearColor( 0x050505, 1 );
        @renderer.autoClear = false;

        @container.appendChild( @renderer.domElement );

        requestAnimationFrame((timestamp)=> @Render(timestamp))

    Render: (timestamp) ->
        @renderer.clear()
        @renderer.render( @scene, @camera );
