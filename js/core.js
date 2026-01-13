class PhotobookCore {
    constructor() {
        this.pages = []; // Κάθε σελίδα είναι {image: base64Data}
    }

    addPage(imageData) {
        this.pages.push({ image: imageData });
        console.log("Page added. Total pages:", this.pages.length);
    }

    clearPages() {
        this.pages = [];
    }

    exportFlipbook() {
        if (this.pages.length === 0) {
            alert("Παρακαλώ προσθέστε τουλάχιστον μία σελίδα!");
            return;
        }

        const flipbookContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Το Flipbook μου</title>
    <script src="https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.min.js"></script>
    <style>
        body {
            background-color: #2c2c2c;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
        }
        .container {
            width: 100%;
            height: 85vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #flipbook {
            box-shadow: 0 0 100px rgba(0,0,0,0.7);
        }
        .page {
            background-color: white;
            width: 100%;
            height: 100%;
        }
        .page img {
            width: 100%;
            height: 100%;
            object-fit: contain; /* Αυτό εμποδίζει το "κόψιμο" της εικόνας */
            display: block;
        }
        .controls {
            margin-top: 20px;
            display: flex;
            gap: 20px;
            z-index: 10;
        }
        .btn {
            background: #444;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: 0.3s;
        }
        .btn:hover { background: #666; }
        .hint { color: #aaa; margin-top: 10px; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div id="flipbook">
            ${this.pages.map(p => `
                <div class="page">
                    <img src="${p.image}" alt="Page">
                </div>
            `).join('')}
        </div>
    </div>

    <div class="controls">
        <button class="btn" id="prevBtn">⬅ Προηγούμενο</button>
        <button class="btn" id="nextBtn">Επόμενο ➡</button>
    </div>
    <div class="hint">Χρησιμοποιήστε τα κουμπιά, το ποντίκι ή τα βέλη του πληκτρολογίου</div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const htmlElement = document.getElementById('flipbook');
            const pageFlip = new St.PageFlip(htmlElement, {
                width: 550, // πλάτος μιας σελίδας
                height: 733, // ύψος μιας σελίδας (A4 ratio)
                size: "stretch",
                minWidth: 315, maxWidth: 1000,
                minHeight: 420, maxHeight: 1350,
                maxShadowOpacity: 0.5,
                showCover: true,
                usePortrait: true,
                mobileScrollSupport: false
            });

            pageFlip.loadFromHTML(document.querySelectorAll('.page'));

            // Κουμπιά
            document.getElementById('prevBtn').addEventListener('click', () => pageFlip.flipPrev());
            document.getElementById('nextBtn').addEventListener('click', () => pageFlip.flipNext());

            // Βέλη Πληκτρολογίου
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') pageFlip.flipPrev();
                if (e.key === 'ArrowRight') pageFlip.flipNext();
            });
        });
    </script>
</body>
</html>`;

        const blob = new Blob([flipbookContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flipbook_animated.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

// Δημιουργία global instance
window.photobookCore = new PhotobookCore();
