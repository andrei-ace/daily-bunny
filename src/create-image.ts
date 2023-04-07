import * as dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';
import { connectToDatabase, insertData, getDataSortedByDate, IGeneratedImageData } from './db';

import * as fs from 'fs';
import * as fetch from 'node-fetch';
import * as path from 'path';

dotenv.config({path: path.resolve(__dirname,'../config/.env')});

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function withRetry(fn: () => Promise<any>, retries: number = 3, delay: number = 1000): Promise<any> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Retrying in ${delay}ms... (remaining retries: ${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return await withRetry(fn, retries - 1, delay * 2);
    } else {
      throw error;
    }
  }
}

async function generatePrompt(): Promise<string> {
  const promptResponse = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible.' },
      { role: 'user', content: 'Generate an interesting image description for today. It should be linked with a "sweet bunny". It should be in the style of a famous painter.' },
    ],
  });

  return promptResponse.data.choices[0]!.message!.content.trim();
}

async function generateImage(prompt: string): Promise<string> {
  const imageResponse = await openai.createImage({
    prompt: prompt,
    n: 1,
    size: '1024x1024',
  });

  return imageResponse.data.data[0]!.url!;
}

async function downloadImage(imageUrl: string, imagePath: string): Promise<void> {
  const response = await fetch.default(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  await new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(imagePath);
    response.body!.pipe(fileStream);
    response.body!.on('error', (err) => {
      fileStream.close();
      reject(err);
    });
    fileStream.on('finish', () => {
      fileStream.close();
      resolve(null);
    });
  });
}

async function main() {
  // Connect to the database
  const db = await connectToDatabase(process.env.MONGODB_URI!);

  const prompt = await withRetry(generatePrompt);
  console.log('Generated prompt:', prompt);
  const generatedDate = new Date();

  const imageUrl = await withRetry(() => generateImage(prompt));
  console.log('Generated image URL:', imageUrl);

  const imagePath = path.resolve(process.env.IMAGE_DIR!, generatedDate.toISOString() + '.png');
  fs.mkdirSync(path.dirname(imagePath), { recursive: true });

  await downloadImage(imageUrl, imagePath);
  console.log('Image downloaded to:', imagePath);

  const relativePath = imagePath.replace(process.env.PWD!, "");
  // Insert the generated image data into the database
  const generatedImageData = await insertData(imageUrl, relativePath, prompt, generatedDate);
  console.log('Generated image data saved to database:', generatedImageData);

  // Retrieve the data sorted by date (newest first)
  const imageDataList = await getDataSortedByDate();
  console.log('Image data sorted by date (newest first):', imageDataList);

  await db.disconnect()

}

main().catch((error) => console.error('An error occurred:', error));

