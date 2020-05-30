const fetch = require('node-fetch')
const chalk = require('chalk')

const orgname = 'bigchaindb'
const reponame = 'bigchaindb' // Used for fetching specific release

const log = text => console.log(text)
const logError = text => console.log(chalk.bold.red(text))

// Response handling for all fetch calls
const handleResponse = async response => {
    if (response.status !== 200) {
        return logError('Non-200 response code from GitHub: ' + response.status)
    }

    const json = await response.json()
    return json
}

// Request options for all fetch calls
const options = {
    headers: {
        // For getting topics, see note on https://developer.github.com/v3/search/
        Accept: 'application/vnd.github.mercy-preview+json'
        // Accept: 'application/vnd.github.preview'
    }
}

//
// Fetch all public GitHub repos
//
const fetchRepos = async () => {
    const start = Date.now()
    const url = 'https://api.github.com/orgs/' + orgname + '/repos'

    const response = await fetch(url, options)
    const json = await handleResponse(response)

    const repos = json.map(({
        name,
        description,
        html_url,
        stargazers_count,
        forks_count,
        fork,
        topics
    }) => ({
        name,
        description,
        url: html_url,
        stars: stargazers_count,
        forks: forks_count,
        is_fork: fork,
        topics
    })).sort((p1, p2) => p2.stars - p1.stars)

    log(`Total: ${repos.length} public BigchainDB projects. ` +
        `Elapsed: ${(new Date() - start)}ms`)

    return repos
}

//
// Fetch GitHub releases
//
// @TODO: make this fetch all releases of all repos
//
const fetchReleases = async () => {
    const start = Date.now()
    const url = 'https://api.github.com/repos/bigchaindb/' + reponame + '/releases/latest'

    const response = await fetch(url, options)
    const json = await handleResponse(response)

    const releases = ({
        name: reponame,
        release: json.tag_name,
        release_url: json.html_url
    })

    log(`Latest release: ${json.tag_name}. ` +
        `Elapsed: ${(new Date() - start)}ms`)

    return releases
}

//
// Create the response
//
module.exports = async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET')

    //
    // Let's roll
    //
    try {
        const repos = await fetchRepos()
        const releases = await fetchReleases()

        // Merge the responses together
        // kinda hacky, needs rewrite for adding release info to all objects in dataRepos
        let data
        data = await Object.assign(releases, repos[0])
        data = Object.assign(repos, {0: data})
        const dataPretty = JSON.stringify(data, null, 2)

        response.end(dataPretty)
    } catch (error) {
        logError('Error parsing response from GitHub: ' + error.message)
    }
}
