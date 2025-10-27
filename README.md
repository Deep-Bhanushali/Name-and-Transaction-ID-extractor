# Transaction Extractor

A Node.js web application that extracts names and transaction IDs from transaction data in CSV or Excel files. It parses the "Transaction Remarks" column, identifies payment methods (UPI, NEFT, RTGS, CLG, IMPS, CMS, BIL/INFT), extracts the transaction maker's name, and generates formatted transaction IDs based on the method-specific rules.

## Features

- **File Upload Support**: Accepts CSV and Excel (.xlsx) files
- **Multiple Payment Methods**: Handles UPI, NEFT, RTGS, CLG, IMPS, CMS, and BIL/INFT transactions
- **Name Extraction**: Distinguishes between direct names, indirect identifiers (@ symbols), and filters out remarks/remittances
- **Transaction ID Formatting**: Applies specific length and format rules for each payment method
- **Automatic Download**: Adds "Name" and "Transaction ID" columns to your file and returns it for download
- **Clean UI**: Simple, styled web interface

## Supported Payment Methods & ID Formats

| Method | ID Length | Example Format |
|--------|-----------|----------------|
| UPI    | 12 digits | UPI-123456789012 |
| NEFT   | 22 chars  | NEFT-XXXXXXXXXXXXXXXXXXXXXX |
| RTGS   | 22 chars  | RTGS-XXXXXXXXXXXXXXXXXXXXXX |
| CLG    | 6 chars   | CLG-XXXXXX |
| IMPS   | 12 digits | IMPS-123456789012 |
| CMS    | 15 chars  | CMS-XXXXXXXXXXXXXXX |
| INFT   | 10 chars  | INFT-XXXXXXXXXX |

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

1. Clone or download the project files
2. Navigate to the project directory
3. Install dependencies:
```bash
npm install
```

## Usage

1. Start the application:
```bash
npm start
```

2. Open your browser and go to http://localhost:3000
3. Upload your CSV or Excel file containing transaction data
4. The processed file will automatically download with added "Name" and "Transaction ID" columns

## File Format

Your input file should contain a column named "Transaction Remarks" with transaction details in the format shown in the sample data (e.g., "UPI/SAURABH BI/...").

## Name Extraction Rules

- **Direct Names**: Extracts proper names (with spaces, excluding remarks like "paid via", "no remark", bank names)
- **Indirect Names**: Uses account/phone numbers before '@' in UPI transactions if direct names aren't found
- **Fallback**: Sets name to 'UNKNOWN' if no valid name can be identified

## Sample Transaction Remarks

- UPI: "UPI/SAURABH BI/marinerdoon007/SAURABH BI/State Bank/528414350208/AXI..."
- NEFT: "NEFT-SBINN52025101159987160-LAKSHMAN PRASAD KUSHWAHA-..."
- RTGS: "RTGS-AUBLR62025101119160035-NITIN BANSWAL-..."
- CLG: "CLG/AMITA ASHISH PARIYAL/000012/HDF/..."
- IMPS: "MMT/IMPS/528413024255/P2A Fund Transf/UJAS TARUN/..."
- CMS: "CMS/CMS5347378404_1/..."
- INFT: "BIL/INFT/EJF6984544/FINAL LANDPAY/FISHAN UR REHMA/..."

## Dependencies

- Express.js - Web framework
- Multer - File upload handling
- xlsx - Excel file processing
- csv-parser & csv-writer - CSV handling

## License

This project is for educational/commercial use. Modify as needed.
