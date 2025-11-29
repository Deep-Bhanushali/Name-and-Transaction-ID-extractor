const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Set up multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.VERCEL ? '/tmp' : 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

app.use(express.static('public'));
app.use(express.json());

// Serve index.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Ensure uploads directory exists (for local dev)
const uploadsDir = process.env.VERCEL ? '/tmp' : 'uploads/';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

function parseTransaction(remarks) {
    const result = { name: '', 'transaction-id': '' };

    // Normalize spaces
    const remark = remarks.replace(/\s+/g, ' ').trim();

    if (remark.startsWith('CMS/')) {
        result.name = 'UNKNOWN';
        const parts = remark.split('/');
        result['transaction-id'] = parts[1] && parts[1].length === 15 ? `CMS-${parts[1]}` : 'UNKNOWN';
    } else if (remark.startsWith('UPI/')) {
        const parts = remark.split('/').filter(p => p.length > 0);
        parts.shift(); // remove "UPI"
        // Find name: the first part with space, no digits, no @, and not common remarks
        result.name = 'UNKNOWN';
        for (const part of parts) {
            if (part.includes(' ') && !/\d/.test(part) && !part.includes('@')) {
                const lower = part.toLowerCase().trim();
                if (!lower.includes('remark') && !lower.includes('fund') && !lower.includes('payment') &&
                    !lower.startsWith('paid') && !lower.includes('booking') &&
                    !lower.includes('request') && !lower.includes('sent') &&
                    !lower.includes('p2a') && !lower.includes('bill payment') && !lower.includes('kotak') && !lower.includes('nat') &&
                    !lower.includes('bank')) {
                    result.name = part.trim();
                    break;
                }
            }
        }
        // If no direct name, check for indirect with @
        if (result.name === 'UNKNOWN') {
            for (const part of parts) {
                if (part.includes('@')) {
                    result.name = part.trim();
                    break;
                }
            }
        }
        // ID: find 12 digit number, else last part
        const digit12 = remark.match(/(\d{12})/g);
        if (digit12 && digit12[0].length === 12) {
            result['transaction-id'] = `UPI-${digit12[0]}`;
        } else {
            const idPart = parts[parts.length - 1];
            result['transaction-id'] = idPart && idPart.length > 10 ? `UPI-${idPart}` : 'UNKNOWN';
        }
    } else if (remark.startsWith('NEFT-')) {
        const parts = remark.split('-').filter(p => p.length > 0);
        const idPart = parts.length > 1 ? parts[1] : '';
        result['transaction-id'] = (idPart.length === 16 || idPart.length === 18 || idPart.length === 22) ? `NEFT-${idPart}` : 'UNKNOWN';
        result.name = parts.length > 2 ? parts[2] : 'UNKNOWN';
    } else if (remark.startsWith('RTGS-')) {
        const parts = remark.split('-').filter(p => p.length > 0);
        const idPart = parts.length > 1 ? parts[1] : '';
        result['transaction-id'] = idPart.length >= 22 ? `RTGS-${idPart}` : 'UNKNOWN';
        result.name = parts.length > 2 ? parts[2] : 'UNKNOWN';
    } else if (remark.startsWith('CLG/')) {
        const parts = remark.split('/').filter(p => p.length > 0);
        result.name = parts.length > 1 ? parts[1] : 'UNKNOWN';
        const idPart = parts.length > 2 ? parts[2] : '';
        result['transaction-id'] = idPart.length === 6 ? `CLG-${idPart}` : 'UNKNOWN';
    } else if (remark.startsWith('MMT/')) {
        const parts = remark.split('/').filter(p => p.length > 0);
        result.name = parts.length > 4 ? parts[4] : (parts.length > 3 ? parts[3] : 'UNKNOWN');
        const idPart = parts.length > 2 ? parts[2] : '';
        // IMPS for IMPS, 12 digits
        if (remark.includes('IMPS') && idPart.length === 12) {
            result['transaction-id'] = `IMPS-${idPart}`;
        } else {
            result['transaction-id'] = 'UNKNOWN';
        }
    } else if (remark.startsWith('BIL/')) {
        const parts = remark.split('/').filter(p => p.length > 0);
        result.name = parts.length > 4 ? parts[4] : (parts.length > 3 ? parts[3] : 'UNKNOWN');
        const idPart = parts.length > 2 ? parts[2] : '';
        // INFT, 10 digits EKW or EJW...
        if (/(EKW|EJW)\d{7}/.test(idPart)) {
            result['transaction-id'] = `INFT-${idPart}`;
        } else {
            result['transaction-id'] = 'UNKNOWN';
        }
    } else {
        result.name = 'UNKNOWN';
        result['transaction-id'] = 'UNKNOWN';
    }

    // Clean up names
    result.name = result.name.trim();
    return result;
}

app.post('/upload', upload.single('file'), (req, res) => {
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const processedDir = process.env.VERCEL ? '/tmp' : 'uploads';
    const processedPath = path.join(processedDir, 'processed' + Date.now() + ext);

    if (ext === '.xlsx') {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        data.forEach(row => {
            const remarks = row['Transaction Remarks'];
            if (remarks) {
                const extracted = parseTransaction(remarks);
                row['Name'] = extracted.name;
                row['Transaction ID'] = extracted['transaction-id'];
            } else {
                row['Name'] = '';
                row['Transaction ID'] = '';
            }
        });

        const newWorkbook = xlsx.utils.book_new();
        const newSheet = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');
        xlsx.writeFile(newWorkbook, processedPath);

        fs.unlinkSync(filePath);
        res.download(processedPath, 'processed.xlsx', (err) => {
            if (!err) fs.unlinkSync(processedPath);
        });
    } else if (ext === '.csv') {
        const rows = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                rows.push(row);
            })
            .on('end', () => {
                rows.forEach(row => {
                    const remarks = row['Transaction Remarks'];
                    if (remarks) {
                        const extracted = parseTransaction(remarks);
                        row['Name'] = extracted.name;
                        row['Transaction ID'] = extracted['transaction-id'];
                    } else {
                        row['Name'] = '';
                        row['Transaction ID'] = '';
                    }
                });

                const header = Object.keys(rows[0] || {}).map(key => ({ id: key, title: key }));
                const csvWriter = createCsvWriter({
                    path: processedPath,
                    header: header
                });

                csvWriter.writeRecords(rows).then(() => {
                    fs.unlinkSync(filePath);
                    res.download(processedPath, 'processed.csv', (err) => {
                        if (!err) fs.unlinkSync(processedPath);
                    });
                });
            });
    }
});

module.exports = app;
