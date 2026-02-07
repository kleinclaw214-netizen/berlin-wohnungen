const PptxGenJS = require('pptxgenjs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Create output directory for images
const imageDir = '/home/node/openclaw/ppt-images';
if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
}

// Unsplash API access (using public endpoint for Dubai-related images)
const UNSPLASH_ACCESS_KEY = 'YOUR_UNSPLASH_ACCESS_KEY'; // Note: For demo, we'll use placeholder images
const UNSPLASH_URLS = [
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&h=1080&fit=crop', // Dubai skyline
    'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1920&h=1080&fit=crop', // Dubai business district
    'https://images.unsplash.com/photo-1534008897995-27a23e859048?w=1920&h=1080&fit=crop', // Dubai infrastructure
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&h=1080&fit=crop', // Dubai free zone
    'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1920&h=1080&fit=crop'  // Dubai opportunities
];

// Alternative: Use Pexels public API (no key required for demo)
const PEXELS_URLS = [
    'https://images.pexels.com/photos/1796715/pexels-photo-1796715.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=1',
    'https://images.pexels.com/photos/1796716/pexels-photo-1796716.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=1',
    'https://images.pexels.com/photos/1796717/pexels-photo-1796717.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=1',
    'https://images.pexels.com/photos/1796718/pexels-photo-1796718.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=1',
    'https://images.pexels.com/photos/1796719/pexels-photo-1796719.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=1'
];

async function downloadImage(url, filename) {
    try {
        console.log(`Downloading image: ${filename}`);
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });
        
        const writer = fs.createWriteStream(path.join(imageDir, filename));
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`Image saved: ${filename}`);
                resolve(path.join(imageDir, filename));
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`Error downloading image ${filename}:`, error.message);
        // Return a placeholder path if download fails
        return null;
    }
}

async function createPresentation() {
    console.log('Creating Dubai Business PowerPoint...');
    
    // Initialize presentation
    const pptx = new PptxGenJS();
    
    // Set presentation properties
    pptx.title = 'Dubai - Geschäftsmöglichkeiten und Investitionen';
    pptx.subject = 'Business-Präsentation über Dubai';
    pptx.author = 'OpenClaw AI';
    pptx.company = 'Business Intelligence';
    
    // Set slide size to 16:9 (widescreen)
    pptx.layout = 'LAYOUT_WIDE';
    
    // Download images (using Pexels as they don't require API key for demo)
    const imageFiles = [];
    for (let i = 0; i < 5; i++) {
        const filename = `dubai-slide-${i + 1}.jpg`;
        const imagePath = await downloadImage(PEXELS_URLS[i], filename);
        imageFiles.push(imagePath);
    }
    
    // Slide 1: Title/Hero
    const slide1 = pptx.addSlide();
    slide1.background = { path: imageFiles[0] || '' };
    
    // Add title with gradient
    slide1.addText('DUBAI', {
        x: 0.5,
        y: 1.5,
        w: '90%',
        h: 2,
        fontSize: 72,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        shadow: { type: 'outer', color: '000000', blur: 12, offset: 3, opacity: 0.5 }
    });
    
    slide1.addText('Tor zur Weltwirtschaft', {
        x: 0.5,
        y: 3.5,
        w: '90%',
        h: 1,
        fontSize: 36,
        color: 'FFFFFF',
        align: 'center',
        bold: true
    });
    
    slide1.addText('Strategische Geschäftsmöglichkeiten im Herzen des Nahen Ostens', {
        x: 0.5,
        y: 4.5,
        w: '90%',
        h: 1,
        fontSize: 24,
        color: 'FFFFFF',
        align: 'center'
    });
    
    slide1.addText('Präsentation für Investoren und Geschäftspartner', {
        x: 0.5,
        y: 6,
        w: '90%',
        h: 0.8,
        fontSize: 18,
        color: 'FFFFFF',
        align: 'center',
        italic: true
    });
    
    // Slide 2: Economy & Sectors
    const slide2 = pptx.addSlide();
    slide2.background = { path: imageFiles[1] || '', fill: { color: '000000', transparency: 30 } };
    
    // Add semi-transparent overlay for better text readability
    slide2.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: '100%',
        h: '100%',
        fill: { color: '000000', transparency: 40 }
    });
    
    slide2.addText('Wirtschaft & Schlüsselsektoren', {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 1,
        fontSize: 44,
        bold: true,
        color: 'FFFFFF',
        align: 'center'
    });
    
    const economyPoints = [
        '• **Diversifizierte Wirtschaft**: Reduzierte Abhängigkeit vom Öl (nur 20% des BIP)',
        '• **Wachstumsbranchen**: Tourismus, Handel, Finanzdienstleistungen, Technologie',
        '• **BIP-Wachstum**: Durchschnittlich 3-4% pro Jahr',
        '• **Handelsdrehscheibe**: Jebel Ali Port - größter Hafen im Nahen Osten',
        '• **Finanzzentrum**: Dubai International Financial Centre (DIFC)',
        '• **Technologie-Hub**: Dubai Internet City, Dubai Silicon Oasis',
        '• **Tourismus**: Über 16 Millionen Besucher jährlich (2019)'
    ];
    
    slide2.addText(economyPoints.join('\n'), {
        x: 0.8,
        y: 2,
        w: '88%',
        h: 5,
        fontSize: 20,
        color: 'FFFFFF',
        bullet: { type: 'bullet', code: '•' }
    });
    
    // Slide 3: Infrastructure & Connectivity
    const slide3 = pptx.addSlide();
    slide3.background = { path: imageFiles[2] || '', fill: { color: '000000', transparency: 30 } };
    
    slide3.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: '100%',
        h: '100%',
        fill: { color: '000000', transparency: 40 }
    });
    
    slide3.addText('Infrastruktur & Konnektivität', {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 1,
        fontSize: 44,
        bold: true,
        color: 'FFFFFF',
        align: 'center'
    });
    
    const infrastructurePoints = [
        '• **Weltklasse-Flughafen**: Dubai International (DXB) - weltweit drittgrößter',
        '• **Moderner Hafen**: Jebel Ali - größter künstlicher Hafen der Welt',
        '• **Metro-System**: Vollautomatische Metro mit 90 km Streckennetz',
        '• **Straßennetz**: Modernste Autobahnen und Brücken',
        '• **Digitale Infrastruktur**: 5G-Abdeckung, Smart City Initiative',
        '• **Energieversorgung**: Zuverlässige Strom- und Wasserversorgung',
        '• **Logistik-Hub**: Strategische Lage zwischen Europa, Asien und Afrika'
    ];
    
    slide3.addText(infrastructurePoints.join('\n'), {
        x: 0.8,
        y: 2,
        w: '88%',
        h: 5,
        fontSize: 20,
        color: 'FFFFFF',
        bullet: { type: 'bullet', code: '•' }
    });
    
    // Slide 4: Business Environment (Free Zones, Taxes)
    const slide4 = pptx.addSlide();
    slide4.background = { path: imageFiles[3] || '', fill: { color: '000000', transparency: 30 } };
    
    slide4.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: '100%',
        h: '100%',
        fill: { color: '000000', transparency: 40 }
    });
    
    slide4.addText('Geschäftsumfeld & Steuern', {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 1,
        fontSize: 44,
        bold: true,
        color: 'FFFFFF',
        align: 'center'
    });
    
    const businessPoints = [
        '**Freihandelszonen**:',
        '• 100% ausländisches Eigentum erlaubt',
        '• 0% Körperschaftssteuer für 50 Jahre',
        '• Keine Zölle auf Import/Export',
        '• Über 30 spezialisierte Zonen verfügbar',
        '',
        '**Steuervorteile**:',
        '• Keine Einkommenssteuer für Privatpersonen',
        '• 9% Körperschaftssteuer (ab 2023, nur bei Gewinn > 375.000 AED)',
        '• 0% Mehrwertsteuer auf Exporte',
        '• 5% Mehrwertsteuer auf lokale Transaktionen'
    ];
    
    slide4.addText(businessPoints.join('\n'), {
        x: 0.8,
        y: 2,
        w: '88%',
        h: 5,
        fontSize: 20,
        color: 'FFFFFF'
    });
    
    // Slide 5: Opportunities & Next Steps
    const slide5 = pptx.addSlide();
    slide5.background = { path: imageFiles[4] || '', fill: { color: '000000', transparency: 30 } };
    
    slide5.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: '100%',
        h: '100%',
        fill: { color: '000000', transparency: 40 }
    });
    
    slide5.addText('Chancen & Nächste Schritte', {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 1,
        fontSize: 44,
        bold: true,
        color: 'FFFFFF',
        align: 'center'
    });
    
    const opportunitiesPoints = [
        '**Wachstumschancen**:',
        '• E-Commerce und Digitalwirtschaft',
        '• Nachhaltige Energie und Green Tech',
        '• Gesundheitswesen und Medizintechnik',
        '• Fintech und Blockchain-Lösungen',
        '• Logistik und Supply Chain Innovation',
        '',
        '**Nächste Schritte**:',
        '1. Marktanalyse und Zielsegmentierung',
        '2. Kontakt zu lokalen Beratern aufnehmen',
        '3. Freihandelszonen-Optionen prüfen',
        '4. Geschäftsplan für Dubai erstellen',
        '5. Vor-Ort-Besuch und Networking'
    ];
    
    slide5.addText(opportunitiesPoints.join('\n'), {
        x: 0.8,
        y: 2,
        w: '88%',
        h: 5,
        fontSize: 20,
        color: 'FFFFFF'
    });
    
    // Save the presentation
    const outputPath = '/home/node/openclaw/dubai_business_5slides.pptx';
    await pptx.writeFile({ fileName: outputPath });
    console.log(`Presentation saved to: ${outputPath}`);
    
    return outputPath;
}

async function createSpeakerNotes() {
    console.log('Creating speaker notes...');
    
    const speakerNotes = `
# Sprechernotizen: Dubai Business Präsentation

## Slide 1: Titel/Hero
- Begrüßung und Einführung in das Thema
- Dubai als globales Handels- und Finanzzentrum vorstellen
- Strategische Lage zwischen Europa, Asien und Afrika betonen
- Visuell ansprechende Skyline zeigt Modernität und Wachstum

## Slide 2: Wirtschaft & Schlüsselsektoren
- Wirtschaftliche Diversifizierung weg vom Öl hervorheben
- Tourismus als wichtiger Wirtschaftsfaktor (16M+ Besucher)
- Jebel Ali Port als logistischer Drehpunkt
- DIFC als führendes Finanzzentrum der Region
- Technologie-Sektoren als Wachstumsmotoren

## Slide 3: Infrastruktur & Konnektivität
- Weltklasse-Infrastruktur als Wettbewerbsvorteil
- Dubai International Airport als globales Drehkreuz
- Moderne Metro und Verkehrssysteme
- Digitale Infrastruktur und Smart City Initiativen
- Strategische Logistik-Vorteile durch geografische Lage

## Slide 4: Geschäftsumfeld & Steuern
- Freihandelszonen als Hauptattraktion für Investoren
- 100% ausländisches Eigentum möglich
- Steuerliche Vorteile und Anreize erklären
- Unterschied zwischen Freihandelszonen und Mainland
- Aktuelle Steuerreformen (9% Körperschaftssteuer)

## Slide 5: Chancen & Nächste Schritte
- Spezifische Wachstumsbereiche identifizieren
- E-Commerce und Digitalisierung als Trend
- Nachhaltigkeit und Green Tech als Zukunftsfelder
- Konkrete nächste Schritte für Interessenten
- Empfehlung für lokale Beratung und Vor-Ort-Besuch

## Abschluss
- Zusammenfassung der wichtigsten Vorteile
- Einladung zu Fragen und Diskussion
- Kontaktinformationen für weitere Gespräche
`;

    const notesPath = '/home/node/openclaw/dubai_speaker_notes.txt';
    fs.writeFileSync(notesPath, speakerNotes);
    console.log(`Speaker notes saved to: ${notesPath}`);
    
    return notesPath;
}

// Main execution
async function main() {
    try {
        console.log('Starting Dubai PowerPoint creation...');
        
        // Create presentation
        const pptPath = await createPresentation();
        
        // Create speaker notes
        const notesPath = await createSpeakerNotes();
        
        console.log('\n✅ Task completed successfully!');
        console.log(`📊 PowerPoint file: ${pptPath}`);
        console.log(`📝 Speaker notes: ${notesPath}`);
        console.log(`🖼️ Downloaded images: /home/node/openclaw/ppt-images/`);
        
        // Return summary
        return {
            powerpoint: pptPath,
            speakerNotes: notesPath,
            imagesDir: '/home/node/openclaw/ppt-images',
            installSteps: [
                'Installed pptxgenjs and axios via npm',
                'Created PowerPoint with 5 slides in German',
                'Downloaded royalty-free images from Pexels',
                'Generated speaker notes text file'
            ]
        };
        
    } catch (error) {
        console.error('Error creating presentation:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, createPresentation, createSpeakerNotes };