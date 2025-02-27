# LMS PDF Automater

`lms-pdf-automater` is a script used to automate the downloading of all the PDFs of the respective courses from your NUST LMS.

## Features

- Automated login to LMS
- Interactive course selection
- Automatic file organization by course
- Supports multiple file types:
  - PDF documents
  - Word documents (.docx)
  - PowerPoint presentations (.pptx)
  - Excel spreadsheets (.xlsx)
- Tracks downloaded files to avoid duplicates
- Creates an organized folder structure for each course

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone this repository:

   ```sh
   git clone https://github.com/AbdulHadi17/lms-pdf-automater.git
   cd lms-pdf-automater
   ```

2. Install the required dependencies:

   ```sh
   npm install
   ```

3. Create a `.env` file in the root directory with your LMS credentials:

   ```dotenv
   MY_LMS_URL=your_lms_url
   LMS_USERNAME=your_username
   LMS_PASSWORD=your_password
   ```

## Usage

Run the script using the following command:

```sh
node index.js
```

The tool will:

1. Log into your LMS account.
2. Display available courses.
3. Prompt you to select a course.
4. Create a course-specific folder.
5. Download all available materials.
6. Track downloaded files to avoid duplicates.

## File Structure

```plaintext
lms-pdf-automater/
├── index.js
├── .env
├── downloaded_files.txt
└── Lectures/
    └── [Course Name]/
        ├── Lecture1.pdf
        ├── Assignment1.docx
        └── ...
```

## Dependencies

- puppeteer - For web automation
- axios - For file downloads
- dotenv - For environment variables
- fs - For file system operations
- path - For path manipulations

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Thanks to the NUST LMS team for providing the platform.
- Special thanks to all contributors and users.

## Note
Publishing issues and contributing is highly appreciated. Your feedback and contributions help improve this project for everyone.
feel free to mail me at azahid.bese23seecs@seecs.edu.pk for collaborations and future enhancements.
