import * as mongoose from 'mongoose';

const { Schema } = mongoose;

export interface IGeneratedImageData extends mongoose.Document {
  imageUrl: string;
  imagePath: string;
  description: string;
  date: Date;
}

const generatedImageDataSchema = new Schema<IGeneratedImageData>({
  imageUrl: { type: String, required: true },
  imagePath: {type: String, required: true},
  description: { type: String, required: true },
  date: { type: Date, required: true },
});

export const GeneratedImageData = mongoose.model<IGeneratedImageData>('GeneratedImageData', generatedImageDataSchema);

export async function connectToDatabase(uri: string): Promise<typeof mongoose> {
  return mongoose.connect(uri, {
    autoIndex: true,
    autoCreate: true,
  });
}

export async function insertData(imageUrl: string, imagePath: string, description: string, date: Date): Promise<IGeneratedImageData> {
  const newGeneratedImageData = new GeneratedImageData({ imageUrl, imagePath, description, date });
  return newGeneratedImageData.save();
}

export async function getDataSortedByDate(order: mongoose.SortOrder = -1): Promise<IGeneratedImageData[]> {
  return GeneratedImageData.find().sort({ date: order }).exec();
}
