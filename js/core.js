class PhotobookCore {
    constructor() {
        this.pages = [];
        this.canvasElements = [];
    }

    // Προσθήκη σελίδας (κρατάμε τη λειτουργία για το UI)
    addPage(imageData) {
        this.pages.push({ image: imageData });
        console.log("Σελίδα προστέθηκε. Σύνολο:", this.pages.length);
    }

    // Οι συναρτήσεις που ζητάει το ui.js για να μην πετάει Error
    addCircle() { console.log("Circle added"); }
    addSquare() { console.log("Square added"); }
    addText() { console.log("Text added"); }

    exportFlipbook() {
        if (this.pages.length === 0) {
            alert("Προσθέστε μερικές σελίδες πρώτα!");
            return;
        }

        const flipbookContent = `
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <title>Το Flipbook μου</title>
    <script src="https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.min.js"></script>
    <style>
        body { 
            background: #121212; margin: 0; display: flex; flex-direction: column;
            align-items: center; justify-content: center; height: 100vh; overflow: hidden;
            font-family: 'Segoe UI', sans-serif;
        }
        .container { width: 100%; height: 80vh; display: flex; justify-content: center; align-items: center; }
        #flipbook { box-shadow: 0 0 50px rgba(0,0,0,0.8); }
        .page { background: white; width: 100%; height: 100%; }
        .page img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
        
        /* Navigation Controls */
        .controls { position: fixed; bottom: 40px; display: flex; gap: 30px; align-items: center; z-index: 1000; }
        .nav-btn {
            background: #333; color: white; border: 1px solid #555; padding: 15px 30px;
            cursor: pointer; border-radius: 50px; font-size: 18px; transition: 0.3s;
            display: flex; align-items: center; gap: 10px;
        }
        .nav-btn:hover { background: #555; transform: scale(1.05); }
        .hint { color: #888; margin-top: 15px; font-size: 14px; letter-spacing: 1px; }
    </style>
</head>
<body>
    <div class="container">
        <div id="flipbook">
            ${this.pages.map(p => `
                <div class="page"><img src="${p.image}"></div>
            `).join('')}
        </div>
    </div>

    <div class="controls">
        <button class="nav-btn" id="prevBtn"><span>⬅</span> Πίσω</button>
        <button class="nav-btn" id="nextBtn">Επόμενο <span>➡</span></button>
    </div>
    <div class="hint">Χρησιμοποιήστε τα κουμπιά ή τα βέλη (← →) στο πληκτρολόγιο</div>

    <script>
        window.onload = () => {
            const htmlElement = document.getElementById('flipbook');
            const pageFlip = new St.PageFlip(htmlElement, {
                width: 595, height: 842, // A4 αναλογία
                size: "stretch",
                minWidth: 315, maxWidth: 1000,
                minHeight: 420, maxHeight: 1350,
                showCover: true,
                maxShadowOpacity: 0.5
            });

            pageFlip.loadFromHTML(document.querySelectorAll('.page'));

            // Click Events
            document.getElementById('prevBtn').onclick = () => pageFlip.flipPrev();
            document.getElementById('nextBtn').onclick = () => pageFlip.flipNext();

            // Keyboard Events (Βελάκια)
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') pageFlip.flipPrev();
                if (e.key === 'ArrowRight') pageFlip.flipNext();
            });
        };
    </script>
</body>
</html>`;

        const blob = new Blob([flipbookContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my_photobook.html';
        a.click();
    }
}

// Εξαγωγή των συναρτήσεων που χρειάζεται το ui.js
const coreInstance = new PhotobookCore();
export const addPage = (img) => coreInstance.addPage(img);
export const exportFlipbook = () => coreInstance.exportFlipbook();
export const addCircle = () => coreInstance.addCircle();
export const addSquare = () => coreInstance.addSquare();
export const addText = () => coreInstance.addText();

export default coreInstance;
