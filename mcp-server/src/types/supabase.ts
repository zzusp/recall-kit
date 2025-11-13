import { Database } from './database';

export type ExperienceRecordWithKeywords = Database['public']['Tables']['experience_records']['Row'] & {
  experience_keywords: {
    keyword: string;
  }[];
};

export type ExperienceRecordForUpdate = Database['public']['Tables']['experience_records']['Row'];
export type ExperienceKeywordRecord = Database['public']['Tables']['experience_keywords']['Row'];