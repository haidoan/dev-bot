import { Octokit } from 'octokit';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export default octokit;
