const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const homeDir = process.env.HOME || process.env.HOMEPATH;
const stakePath = path.join(homeDir, '.config/solana/stake.json');
const votePath = path.join(homeDir, '.config/solana/vote.json');
const identityPath = path.join(homeDir, '.config/solana/identity.json');
const withdrawerPath = path.join(homeDir, '.config/solana/id.json');
const archivePath = path.join(homeDir, '.config/solana/archive');

// Paths for wallets.json
const walletsDir = path.join(homeDir, 'x1console');
const solanalabsDir = path.join(homeDir, 'x1/solanalabs');
const walletsFilePath = path.join(walletsDir, 'wallets.json');

if (!fs.existsSync(walletsDir)) {
    fs.mkdirSync(walletsDir, { recursive: true }); // Create the x1console directory if it doesn't exist
}

if (!fs.existsSync(solanalabsDir)) {
    fs.mkdirSync(solanalabsDir, { recursive: true }); // Create the solanalabs directory if it doesn't exist
}

let newWalletsCreated = false; // Track if any new wallets are created

// Function to move and create new stake account
function moveAndCreateStakeAccount() {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(archivePath)) {
            fs.mkdirSync(archivePath);
        }
        const newStakePath = path.join(archivePath, 'stake.json');
        fs.rename(stakePath, newStakePath, (err) => {
            if (err) {
                reject(`Error moving stake account to archive: ${err}`);
                return;
            }
            console.log(`Moved stake.json to archive: ${newStakePath}`);

            exec(`solana-keygen new --no-passphrase -o ${stakePath}`, (keygenError) => {
                if (keygenError) {
                    reject(`Error creating new stake account: ${keygenError}`);
                    return;
                }
                console.log(`Created new stake account: ${stakePath}`);
                newWalletsCreated = true; // A new wallet was created for the stake account

                exec(`solana create-stake-account ${stakePath} 2`, (createError) => {
                    if (createError) {
                        reject(`Error creating stake account: ${createError}`);
                        return;
                    }

                    exec(`solana stake-account ${stakePath}`, (checkError, checkStdout) => {
                        if (checkError) {
                            reject(`Error checking new stake account: ${checkError}`);
                            return;
                        }
                        const outputLines = checkStdout.split('\n').slice(0, 10).join('\n');
                        resolve(`New stake account exists:\n${outputLines}`);
                    });
                });
            });
        });
    });
}

// Function to move and create new vote account
function moveAndCreateVoteAccount() {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(archivePath)) {
            fs.mkdirSync(archivePath);
        }
        const newVotePath = path.join(archivePath, 'vote.json');
        fs.rename(votePath, newVotePath, (err) => {
            if (err) {
                reject(`Error moving vote account to archive: ${err}`);
                return;
            }
            console.log(`Moved vote.json to archive: ${newVotePath}`);

            exec(`solana-keygen new --no-passphrase -o ${votePath}`, (keygenError) => {
                if (keygenError) {
                    reject(`Error creating new vote account: ${keygenError}`);
                    return;
                }
                console.log(`Created new vote account: ${votePath}`);
                newWalletsCreated = true; // A new wallet was created for the vote account

                exec(`solana create-vote-account ${votePath} ${identityPath} ${withdrawerPath} --commission 10`, (createError) => {
                    if (createError) {
                        reject(`Error creating vote account: ${createError}`);
                        return;
                    }

                    exec(`solana vote-account ${votePath}`, (checkError, checkStdout) => {
                        if (checkError) {
                            reject(`Error checking new vote account: ${checkError}`);
                            return;
                        }
                        const outputLines = checkStdout.split('\n').slice(0, 10).join('\n');
                        resolve(`New vote account exists:\n${outputLines}`);
                    });
                });
            });
        });
    });
}

// Function to check stake account
function checkStakeAccount() {
    return new Promise((resolve, reject) => {
        exec(`solana stake-account ${stakePath}`, (error, stdout, stderr) => {
            if (stderr.includes("AccountNotFound")) {
                exec(`solana create-stake-account ${stakePath} 2`, (createErr, createStdout, createStderr) => {
                    if (createErr) {
                        reject(`Error creating stake account: ${createStderr}`);
                    } else {
                        resolve(`Stake account created: ${createStdout}`);
                    }
                });
            } else if (stderr.includes("is not a stake account")) {
                moveAndCreateStakeAccount()
                    .then(message => resolve(message))
                    .catch(err => reject(err));
            } else if (error) {
                reject(`Error checking stake account: ${stderr}`);
                return;
            } else {
                const outputLines = stdout.split('\n').slice(0, 10).join('\n');
                resolve(`Stake account exists:\n${outputLines}`);
            }
        });
    });
}

// Function to check vote account
function checkVoteAccount() {
    return new Promise((resolve, reject) => {
        exec(`solana vote-account ${votePath}`, (error, stdout, stderr) => {
            if (stderr.includes("account does not exist")) {
                exec(`solana create-vote-account ${votePath} ${identityPath} ${withdrawerPath} --commission 10`, (createErr, createStdout, createStderr) => {
                    if (createErr) {
                        reject(`Error creating vote account: ${createStderr}`);
                    } else {
                        resolve(`Vote account created: ${createStdout}`);
                    }
                });
            } else if (stderr.includes("is not a vote account")) {
                moveAndCreateVoteAccount()
                    .then(message => resolve(message))
                    .catch(err => reject(err));
            } else if (error) {
                reject(`Error checking vote account: ${stderr}`);
                return;
            } else {
                const outputLines = stdout.split('\n').slice(0, 10).join('\n');
                resolve(`Vote account exists:\n${outputLines}`);
            }
        });
    });
}

// Function to create wallets.json file, if new wallets were created.
function createWalletsJSON() {
    if (!newWalletsCreated) {
        console.log('No new wallets were created; wallets.json will not be generated.');
        return;
    }

    const wallets = [
        { name: "Withdrawer", address: execSync(`solana-keygen pubkey ${withdrawerPath}`).toString().trim() },
        { name: "Identity", address: execSync(`solana-keygen pubkey ${identityPath}`).toString().trim() },
        { name: "Stake", address: execSync(`solana-keygen pubkey ${stakePath}`).toString().trim() },
        { name: "Vote", address: execSync(`solana-keygen pubkey ${votePath}`).toString().trim() },
    ];

    fs.writeFileSync(walletsFilePath, JSON.stringify(wallets, null, 2));
    console.log('wallets.json created with the following content:');
    console.log(wallets);

    // Copy the wallets.json to the solanalabs directory
    fs.copyFileSync(walletsFilePath, path.join(solanalabsDir, 'wallets.json'));
    console.log(`Copied wallets.json to: ${solanalabsDir}`);
}

// Main function to execute the checks
async function main() {
    try {
        const [stakeResult, voteResult] = await Promise.all([
            checkStakeAccount(),
            checkVoteAccount(),
        ]);
        console.log(stakeResult);
        console.log(voteResult);
        
        // Create wallets.json after checking accounts
        createWalletsJSON();
    } catch (error) {
        console.error(`Error occurred: ${error}`);
    }
}

// Execute the main function
main();