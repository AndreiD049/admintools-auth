import mongoose from 'mongoose';
import config from './config/index.mjs';

export const init = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.info('Successfully connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to mongodb', err);
  }
} 