const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
require('dotenv').config();

// Configuration
const LMS_URL = process.env.MY_LMS_URL;
const LOGIN_URL = `${LMS_URL}/portal/login/index.php`;
const PROFILE_URL = `${LMS_URL}/portal/user/profile.php`;
const USERNAME = process.env.LMS_USERNAME;
const PASSWORD = process.env.LMS_PASSWORD;
const DOWNLOAD_DIR = "Lectures";
const TRACKING_FILE = "downloaded_files.txt";

// Initialize readline interface
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to handle course selection
async function promptForCourseSelection(availableCourses) {
    return new Promise((resolve) => {
        const askForSelection = () => {
            readline.question('\nEnter the number of the course you want to access: ', async (answer) => {
                const selection = parseInt(answer) - 1;
                if (selection >= 0 && selection < availableCourses.length) {
                    const selectedCourse = availableCourses[selection];
                    console.log(`Selected: ${selectedCourse.courseName}`);
                    resolve(selectedCourse);
                } else {
                    console.log('Invalid selection. Please try again.');
                    askForSelection();
                }
            });
        };
        askForSelection();
    });
}

// Function to ensure directory exists
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Function to load tracked files
function loadTrackedFiles() {
    const downloadedFiles = new Set();
    if (fs.existsSync(TRACKING_FILE)) {
        const data = fs.readFileSync(TRACKING_FILE, "utf8");
        data.split("\n").forEach((file) => {
            if (file) downloadedFiles.add(file);
        });
    }
    return downloadedFiles;
}

// Function to download a file using axios with retry mechanism
async function downloadFile(url, filePath, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get(url, { 
                responseType: "stream",
                timeout: 30000 // 30 seconds timeout
            });
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });
            return true;
        } catch (error) {
            if (attempt === maxRetries) throw error;
            console.log(`Retry attempt ${attempt} of ${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

// Main function
(async () => {
    try {
        // Ensure download directory exists
        ensureDirectoryExists(DOWNLOAD_DIR);
        const downloadedFiles = loadTrackedFiles();

        // Launch browser
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        });
        const page = await browser.newPage();

        // Login to LMS
        try {
            await page.goto(LOGIN_URL, { waitUntil: "networkidle2", timeout: 60000 });
            await page.type("#username", USERNAME);
            await page.type("#password", PASSWORD);
            await Promise.all([
                page.click("#loginbtn"),
                page.waitForNavigation({ waitUntil: "networkidle2" })
            ]);
        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
        }

        // Get course list
        await page.goto(PROFILE_URL, { waitUntil: "networkidle2" });
        const courseElements = await page.$$('.media-body');
        console.log(`Found ${courseElements.length} courses`);

        // Extract course information
        const availableCourses = [];
        for (const element of courseElements) {
            const courseInfo = await element.evaluate(el => {
                const heading = el.querySelector('h5');
                const link = el.querySelector('a');
                return {
                    courseName: heading ? heading.textContent.trim() : null,
                    courseId: link ? new URLSearchParams(new URL(link.href).search).get('id') : null
                };
            });
            if (courseInfo.courseName && courseInfo.courseId) {
                availableCourses.push(courseInfo);
                console.log(`${availableCourses.length}. ${courseInfo.courseName}`);
            }
        }

        if (availableCourses.length === 0) {
            throw new Error('No courses found');
        }

        // Get course selection and create directory
        const selectedCourse = await promptForCourseSelection(availableCourses);
        const courseFolderName = selectedCourse.courseName.replace(/[<>:"/\\|?*]/g, '_');
        const coursePath = path.join(DOWNLOAD_DIR, courseFolderName);
        ensureDirectoryExists(coursePath);

        // Navigate to course page
        const courseUrl = `${LMS_URL}/portal/course/view.php?id=${selectedCourse.courseId}`;
        await page.goto(courseUrl, { waitUntil: "networkidle2" });

        // Close readline as we don't need it anymore
        readline.close();

        // Get and process downloadable content
        const activityElements = await page.$$('.activityinstance');
        console.log(`Found ${activityElements.length} activity elements`);

        for (const activity of activityElements) {
            const linkInfo = await activity.evaluate(el => {
                const anchor = el.querySelector('a.aalink');
                if (!anchor) return null;

                const instanceName = el.querySelector('.instancename');
                const resourceType = el.querySelector('.resourcelinkdetails');
                const type = resourceType ? resourceType.textContent.trim().toLowerCase() : '';
                
                let extension = '';
                if (type.includes('pdf')) extension = '.pdf';
                else if (type.includes('word') || type.includes('document')) extension = '.docx';
                else if (type.includes('powerpoint') || type.includes('presentation')) extension = '.pptx';
                else if (type.includes('excel') || type.includes('spreadsheet')) extension = '.xlsx';
                
                if (!extension) return null;

                return {
                    href: anchor.href,
                    filename: instanceName ? `${instanceName.textContent.trim()}${extension}` : '',
                    type: type
                };
            });

            if (!linkInfo) continue;

            const filePath = path.join(coursePath, linkInfo.filename);
            const trackingKey = `${courseFolderName}/${linkInfo.filename}`;

            if (downloadedFiles.has(trackingKey)) {
                console.log(`Skipping ${linkInfo.filename} - already downloaded`);
                continue;
            }

            try {
                console.log(`Downloading ${linkInfo.filename}...`);
                await downloadFile(linkInfo.href, filePath);
                downloadedFiles.add(trackingKey);
                fs.appendFileSync(TRACKING_FILE, `${trackingKey}\n`);
                console.log(`Successfully downloaded ${linkInfo.filename}`);
            } catch (error) {
                console.error(`Failed to download ${linkInfo.filename}: ${error.message}`);
            }
        }

        console.log('Download process completed!');
        await browser.close();
    } catch (error) {
        console.error('An error occurred:', error.message);
        process.exit(1);
    }
})();