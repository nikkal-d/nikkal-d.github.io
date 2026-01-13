class PhotobookCore {
    constructor() {
        this.pages = [];
        this.currentPageIndex = 0;
    }

    addPage(imageData) {
        this.pages.push({
            image: imageData,
            elements: []
        });
    }

    deletePage(index) {
        this.pages.splice(index, 1);
    }

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
    <title>Το Φωτοάλμπουμ μου</title>
    <script src="https://cdn.jsdelivr.net/npm/page-flip/dist/js/page-flip.browser.min.js"></script>
    <style>
        body { 
            background: #1a1a1a; 
            margin: 0; 
            display: flex; 
            flex-direction: column;
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            font-family: sans-serif;
            overflow: hidden;
        }
        
        .container { 
            width: 100%; 
            height: 80vh; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
        }

        #flipbook { 
            box-shadow: 0 0 50px rgba(0,0,0,0.5);
        }

        .page { 
            background: white; 
            overflow: hidden; 
        }

        .page img { 
            width: 100%; 
            height: 100%; 
            object-fit: contain; /* Για να μην κόβεται η φωτογραφία */
            background: #f0f0f0;
        }

        /* Βέλη πλοήγησης */
        .controls {
            position: fixed;
            bottom: 30px;
            display: flex;
            gap: 20px;
            z-index: 100;
        }

        .nav-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 12px 25px;
            cursor: pointer;
            border-radius: 5px;
            font-size: 16px;
            transition: 0.3s;
        }

        .nav-btn:hover {
            background: rgba(255,255,255,0.3);
        }

        .instruction {
            color: rgba(255,255,255,0.5);
            margin-top: 10px;
            font-size: 14px;
        }
    </style>
</head>
<body>

    <div class="container">
        <div id="flipbook">
            ${this.pages.map(page => `
                <div class="page" data-density="hard">
                    <img src="${page.image}" />
                </div>
            `).join('')}
        </div>
    </div>

    <div class="controls">
        <button class="nav-btn" onclick="pageFlip.flipPrev()">Προηγούμενο</button>
        <button class="nav-btn" onclick="pageFlip.flipNext()">Επόμενο</button>
    </div>
    
    <div class="instruction">Χρησιμοποιήστε τα βέλη στο πληκτρολόγιο ή κάντε κλικ στις άκρες των σελίδων</div>

    <script>
        const flipbookElement = document.getElementById('flipbook');
        
        // Αρχικοποίηση του PageFlip
        const pageFlip = new St.PageFlip(flipbookElement, {
            width: 595, // A4 Width σε pixels (περίπου)
            height: 842, // A4 Height
            size: "stretch",
            minWidth: 315,
            maxWidth: 1000,
            minHeight: 420,
            maxHeight: 1350,
            maxShadowOpacity: 0.5,
            showCover: true,
            mobileScrollSupport: false
        });

        pageFlip.loadFromHTML(document.querySelectorAll('.page'));

        // Λειτουργία με βελάκια πληκτρολογίου
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') pageFlip.flipNext();
            if (e.key === 'ArrowLeft') pageFlip.flipPrev();
        });
    </script>
</body>
</html>`;

        const blob = new Blob([flipbookContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flipbook.html';
        a.click();
    }
}

window.photobookCore = new PhotobookCore();
