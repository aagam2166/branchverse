import { Octokit } from "@octokit/rest";

//The work of this file is to given a reposity and PR nubmer it fetches data from github 
//Octokit is Github's API client

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});

export const getPullRequest = async (owner: string, repo: string, pull_number: number) => async (
    repository: string,
    pullNumber: number
) => {
    const [owner, repo] = repository.split("/");

    if (!owner || !repo) {
        throw new Error(`Invalid repository name: ${repository}`);
    }

    const response = await octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
    });

    console.log(response)

    return response.data;
};

export const getRepository = async (repository: string) => {
    const [owner, repo] = repository.split("/");

    if (!owner || !repo) {
        throw new Error(`Invalid repository name: ${repository}`);
    }
    
    const response = await octokit.repos.get({
        owner,
        repo,
    });

    console.log(response)

    return response.data;
}