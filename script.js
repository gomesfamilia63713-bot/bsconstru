import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCvAp3uG-bIESbB8l9dA8HNubNZWGTPi3Y",
    authDomain: "construcontrol-fa49a.firebaseapp.com",
    projectId: "construcontrol-fa49a",
    storageBucket: "construcontrol-fa49a.firebasestorage.app",
    messagingSenderId: "906991631231",
    appId: "1:906991631231:web:82cb3368d10b8fea84b84a",
    measurementId: "G-PBSM39FQ9Z"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const App = {
    senha: "produçãobs",
    logado: false,
    cameraAtual: 'environment',

    // --- LOGIN ---
    login() {
        const senhaDigitada = prompt("Digite a senha de administrador:");
        if (senhaDigitada === this.senha) {
            this.logado = true;
            document.getElementById('sidebar-admin').style.display = 'flex';
            alert("Acesso liberado!");
        } else {
            alert("Senha incorreta!");
        }
    },

    // --- LIMPEZA ---
    limparTudo() {
        if (confirm("ATENÇÃO: Isso apagará todos os dados da nuvem. Confirmar?")) {
            set(ref(db, 'configuracao'), null)
            .then(() => {
                localStorage.clear();
                window.location.reload();
            });
        }
    },

    // --- CÂMERA ---
    async alternarCamera() {
        this.cameraAtual = (this.cameraAtual === 'user') ? 'environment' : 'user';
        this.iniciarCamera();
    },

    async iniciarCamera() {
        const video = document.getElementById('video-ponto');
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: this.cameraAtual } }
            });
            video.srcObject = stream;
        } catch (e) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
        }
    }
};

// --- SINCRONIZAÇÃO E INIT ---
onValue(ref(db, 'configuracao/logoUrl'), (snapshot) => {
    const imgLogo = document.getElementById('logo-sistema-ponto');
    if (imgLogo && snapshot.val()) imgLogo.src = snapshot.val();
});

window.App = App;
