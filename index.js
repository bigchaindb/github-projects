const fetch = require('node-fetch')
const ms = require('ms')
const chalk = require('chalk')

let data = []
let dataRepos = []
let dataReleases = []

const orgname = 'bigchaindb'
const reponame = 'bigchaindb' // Used for fetching specific release

const log = text => console.log(text)
const logError = text => console.log(chalk.bold.red(text))

// Response handling for all fetch calls
const handleResponse = res => {
    if (res.status !== 200) {
        return logError('Non-200 response code from GitHub: ' + res.status)
    }
    return res.json()
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
const fetchRepos = () => {
    const start = Date.now()
    const url = 'https://api.github.com/orgs/' + orgname + '/repos'

    fetch(url, options)
        .then(res => {
            return handleResponse(res)
        })
        .then(data_ => {
            if (!data_) {
                return
            }

            dataRepos = data_.map(({
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

            log(`Re-built projects cache. ` +
                `Total: ${data_.length} public BigchainDB projects. ` +
                `Elapsed: ${(new Date() - start)}ms`)
        })
        .catch(err => {
            logError('Error parsing response from GitHub: ' + err.stack)
        })
}

//
// Fetch GitHub releases
//
// @TODO: make this fetch all releases of all repos
//
const fetchReleases = () => {
    const start = Date.now()
    const url = 'https://api.github.com/repos/bigchaindb/' + reponame + '/releases/latest'

    fetch(url, options)
        .then(res => {
            return handleResponse(res)
        })
        .then(data_ => {
            if (!data_) {
                return
            }

            dataReleases = ({
                name: reponame,
                release: data_.tag_name,
                release_url: data_.html_url
            })

            log(`Re-built releases cache. ` +
                `Latest release: ${data_.tag_name}. ` +
                `Elapsed: ${(new Date() - start)}ms`)
        })
        .catch(err => {
            logError('Error parsing response from GitHub: ' + err.stack)
        })
}

const engage = () => {
    fetchRepos()
    fetchReleases()
}

//
// Let's roll, and roll again every X ms
//
engage()
setInterval(engage, ms('15m'))

//
// Create the response
//
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')

    // Merge the responses together
    // kinda hacky, needs rewrite for adding release info to all objects in dataRepos
    data = Object.assign(dataReleases, dataRepos[0])
    data = Object.assign(dataRepos, {0: data})

    // Make json pretty again.
    data = JSON.stringify(data, null, 2)

    return data
}
