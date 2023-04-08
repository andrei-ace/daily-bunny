import * as dotenv from 'dotenv';
import { connectToDatabase, insertData, getDataSortedByDate, IGeneratedImageData } from './db';
import * as fs from 'fs/promises'
import * as path from 'path';
import { escape } from 'html-escaper';

dotenv.config({path: path.resolve(__dirname,'../config/.env')});

function getFileName(index: number, imageData:IGeneratedImageData):string {
  let fileName = imageData.date.getTime() + ".html";
  if (index === 0) {
    fileName = "index.html";
  }
  return fileName
}

async function main() {
  // Connect to the database
  const db = await connectToDatabase(process.env.MONGODB_URI!);
  // Retrieve the data sorted by date (newest first)
  const imageDataList = await getDataSortedByDate();
  // console.log('Image data sorted by date (newest first):', imageDataList);

  for (let index = 0; index < imageDataList.length; index++) {
    const imageData = imageDataList[index];
    let fileName = imageData.date.getTime() + ".html";
    if (index === 0) {
      fileName = "index.html";
    }
    const filePath = path.resolve(process.env.IMAGE_DIR!, fileName);

    let prevFileName
    let nextFileName
    if (index > 0) {
      nextFileName = getFileName(index-1, imageDataList[index-1])
    }
    if (index < imageDataList.length-1) {
      prevFileName = getFileName(index+1, imageDataList[index+1])
    }

    const html = 
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Bunny</title>
      <style>
      html, body {
        height: 100vh;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        background-color: #f0f0f0;
      }
      .image-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0 10px;
        box-sizing: border-box;
        object-fit: scale-down;
      }
      .nav-links {
        margin-bottom: 15px;
      }
      img {
        max-width: 100%;
        max-height: 70vh;
        object-fit: scale-down;
      }
      p {
        margin: 15px 0;
        font-size: 16px;
        width: 65%;
        box-sizing: border-box;
      }
      a {
        text-decoration: none;
        font-weight: bold;
        color: #007bff;
        margin: 0 10px;
        padding: 5px;
        border-radius: 3px;
      }
      a:hover {
        background-color: #007bff;
        color: white;
      }
      .disabled {
        pointer-events: none;
        color: #6699cc;
      }
      @media screen and (max-width: 800px) {
        html, body {
          justify-content: flex-start;
        }
        .nav-links {
          margin-bottom: 0px;
          margin-top: 15px;
        }
        p {
          width: 90%;
        }
      }
      </style>
    </head>
    <body>
      <div class="image-container">
        <img src="${path.basename(imageData.imagePath)}" alt="${escape(imageData.description)}"/>
        <p>${escape(imageData.description)}</p>
      </div>
      <div class="nav-links">
        <a href="${prevFileName || ''}" ${prevFileName ? "" : 'class="disabled"'}>&larr; Prev</a>
        <a href="${nextFileName || ''}" ${nextFileName ? "" : 'class="disabled"'}>Next &rarr;</a>
      </div>
    </body>
    </html>`;

    await fs.writeFile(filePath, html);
  }

  await db.disconnect();
}

main().catch((error) => console.error('An error occurred:', error));