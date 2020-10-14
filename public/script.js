class Graphics {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        let container = document.getElementById("view");
        container.appendChild(this.renderer.domElement);
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.globe = null;
        // User location
        this.pos = null;
        this.posLabel = this.createLabel();

        // ISS location
        this.iss = null;
        this.issLabel = this.createLabel();

        // Sun location
        this.sun = null;
        this.light = null;
    }

    initialise() {
        // Lights
        this.light = new THREE.DirectionalLight(0xffffff, 1);
        this.scene.add(this.light);
        let ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);
        // Earth
        this.globe = new THREE.Mesh(new THREE.SphereGeometry(100, 64, 64), new THREE.MeshStandardMaterial({ color: "blue", wireframe: true }));
        this.updateGlobe();

        const p = new Promise((resolve, reject) => {});

        this.pos = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 3), new THREE.MeshLambertMaterial({ color: "red", emissive: "red", wireframe: true }));
        this.iss = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 3), new THREE.MeshLambertMaterial({ color: "yellow", emissive: "yellow", wireframe: true }));
        this.sunAnchor = new THREE.Mesh();
        this.sun = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), new THREE.MeshStandardMaterial({ color: "white" }));
        this.sun.position.set(0, 0, 110);
        this.sunAnchor.add(this.sun);
        this.scene.add(this.globe);
        this.camera.position.z = 200;
    }

    loadMaterial(filepath, loader) {
        return new Promise((resolve, reject) => {
            loader.load(
                filepath,
                (texture) => {
                    return resolve(texture);
                },
                undefined,
                (err) => {
                    return reject(err);
                }
            );
        });
    }

    updateGlobe() {
        let loader = new THREE.TextureLoader();
        let mat = this.loadMaterial("images/8081_earthmap2k.jpg", loader);
        let bump = this.loadMaterial("images/8081_earthbump2k.jpg", loader);
        let spec = this.loadMaterial("images/8081_earthspec2k.jpg", loader);
        Promise.all([mat, bump, spec]).then((results) => {
            this.globe.material = new THREE.MeshPhongMaterial({
                map: results[0],
                bumpMap: results[1],
                bumpScale: 0.7,
                specularMap: results[2],
                specular: new THREE.Color("royalblue"),
                shininess: 10,
            });
        });
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.setLabelCoords(this.issLabel, this.iss);
        this.setLabelCoords(this.posLabel, this.pos);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    setMyPositionOnGlobe(lat, lon) {
        const v = this.calculateVector(lat, lon, 102);
        this.pos.position.set(v.x, v.y, v.z);
        this.globe.add(this.pos);
        this.pos.lookAt(new THREE.Vector3(0, 0, 0));
        this.pos.rotateX((90 * Math.PI) / 180);
        this.posLabel.innerText = "You";
        document.body.appendChild(this.posLabel);
    }

    setISSPositionOnGlobe(lat, lon, alt) {
        const v = this.calculateVector(lat, lon, alt);
        this.iss.position.set(v.x, v.y, v.z);
        this.globe.add(this.iss);
        this.iss.lookAt(new THREE.Vector3(0, 0, 0));
        this.iss.rotateX((90 * Math.PI) / 180);
        this.issLabel.innerText = "ISS";
        document.body.appendChild(this.issLabel);
    }

    calculateVector(lat, lon, radius) {
        const phi = (lat * Math.PI) / 180;
        const theta = ((lon - 180) * Math.PI) / 180;
        const x = -radius * Math.cos(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi);
        const z = radius * Math.cos(phi) * Math.sin(theta);
        return { x, y, z };
    }

    setSunPosition(angle) {
        this.sunAnchor.rotateY((-90 * Math.PI) / 180); //set UTC 00:00:00 sun position.
        this.sunAnchor.rotateY((-angle * Math.PI) / 180); //set to current UTC position,
        this.sunAnchor.updateMatrixWorld();
        this.sun.getWorldPosition(this.light.position);
    }

    createLabel() {
        const textLabel = document.createElement("div");
        textLabel.className = "text-label";
        textLabel.style.position = "absolute";
        textLabel.style.width = 100;
        textLabel.style.height = 20;
        textLabel.style.color = "white";
        return textLabel;
    }

    setLabelCoords(label, parent) {
        let vector = parent.position.clone();
        vector.project(this.camera);
        vector.x = ((vector.x + 1) / 2) * window.innerWidth;
        vector.y = (-(vector.y - 1) / 2) * window.innerHeight;
        label.style.left = vector.x + "px";
        label.style.top = vector.y + "px";

        parent.updateMatrixWorld(true);
        let p = new THREE.Vector3();
        parent.getWorldPosition(p);
        let eye = this.camera.position.clone().sub(p);
        let dot = eye.normalize().dot(p.normalize());

        let occluded = dot < -0.2;

        if (occluded) {
            label.style.visibility = "hidden";
        } else {
            label.style.visibility = "visible";
        }
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function makeRequest(method, url) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText,
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText,
            });
        };
        xhr.send();
    });
}

async function getISSPosition() {
    let result = await makeRequest("GET", "https://api.wheretheiss.at/v1/satellites/25544");
    // console.log(result);
    return result;
}

function getApproxSunPosition() {
    const d = new Date();
    let UTCHours = d.getUTCHours();
    let UTCMins = d.getUTCMinutes();
    let UTCSecs = d.getUTCSeconds();
    // console.log(`UTC TIME: ${UTCHours}:${UTCMins}:${UTCSecs}`);
    let secondsElapsed = UTCHours * 60 * 60 + UTCMins * 60 + UTCSecs;
    let percentOfDay = secondsElapsed / 86400;
    let angle = 360 * percentOfDay;
    return angle;
}

function updateISS(graphics, result) {
    let data = JSON.parse(result);
    let altitude = 100 + data.altitude * 0.015;
    graphics.setISSPositionOnGlobe(data.latitude, data.longitude, altitude);
    issPos.innerHTML = `<p>ISS coordinates: <br/> Latitude:${data.latitude} <br/>Longitude:${data.longitude}<br/>Altitude:${data.altitude}</p> `;
}

function getUTCTime() {
    let d = new Date();
    function getDigits(num) {
        if (num < 10) {
            return "0" + num;
        }
        return num;
    }
    document.getElementById("time").innerText = `At UTC: ${getDigits(d.getUTCHours())}:${getDigits(d.getUTCMinutes())}:${getDigits(d.getUTCSeconds())}`;
}

const graphics = new Graphics();
graphics.initialise();
graphics.animate();
const sunPosition = getApproxSunPosition();
graphics.setSunPosition(sunPosition);
const myPos = document.getElementById("myPos");
const issPos = document.getElementById("issPos");
getUTCTime();

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            graphics.setMyPositionOnGlobe(position.coords.latitude, position.coords.longitude);
            myPos.innerHTML = `<p>Your coordinates: <br/> Latitude:${position.coords.latitude} <br/>Longitude:${position.coords.longitude}</p>`;
        },
        (error) => {
            console.log(error);
        },
        { enableHighAccuracy: true }
    );
} else {
    console.log("geolocation not available");
}

getISSPosition().then((result) => {
    updateISS(graphics, result);
});

window.addEventListener(
    "resize",
    function () {
        graphics.onResize();
    },
    false
);

const btn = document.getElementById("btn");
btn.addEventListener("click", () => {
    getISSPosition().then((result) => {
        getUTCTime();
        updateISS(graphics, result);
    });
});
