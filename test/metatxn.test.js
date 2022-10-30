const { ethers } = require("hardhat")
const { BigNumber } = require("ethers")
const { expect } = require("chai")
const { arrayify, parseEther } = require("ethers/lib/utils")

describe("MetaTokenTransfer", () => {
    it("Should let user transfer token through a relayer", async () => {
        // Deploy random contract
        const randomTokenFactory = await ethers.getContractFactory("RandomToken")
        const randomToken = await randomTokenFactory.deploy()
        await randomToken.deployed()

        // Deploy tokenSender contract
        const MetaTokenFactory = await ethers.getContractFactory("TokenSender")
        const tokenSenderContract = await MetaTokenFactory.deploy()
        await tokenSenderContract.deployed()

        // Get users
        const [_, userAddress, relayerAddress, recipientAddress] = await ethers.getSigners()

        const tokenWithDecimals = parseEther("10000")
        // Connect user with tokenContractInstance
        const userTokenContractInstance = randomToken.connect(userAddress)
        const mintTxn = await userTokenContractInstance.freeMint(tokenWithDecimals)
        await mintTxn.wait()

        // Get approval to the user to  transferring "RandomToken"
        const approveTxn = await userTokenContractInstance.approve(
            tokenSenderContract.address,
            BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
        )
        await approveTxn.wait()

        // Have user sign message to transfer 10 tokens to recipient
        const transfetAmountOfToken = parseEther("10")
        const messageHash = await tokenSenderContract.getHash(
            userAddress.address,
            transfetAmountOfToken,
            recipientAddress.address,
            randomToken.address
        )
        const signature = await userAddress.signMessage(arrayify(messageHash))

        // The relayer execute the transaction on behalf of the user
        const relayerSenderContractInstance = tokenSenderContract.connect(relayerAddress)
        const metaTxn = await relayerSenderContractInstance.transfer(
            userAddress.address,
            transfetAmountOfToken,
            recipientAddress.address,
            randomToken.address,
            signature
        )
        await metaTxn.wait()

        const userBalance = await randomToken.balanceOf(userAddress.address)
        const recipientBalance = await randomToken.balanceOf(recipientAddress.address)

        // Expect
        expect(userBalance.lt(tokenWithDecimals)).to.be.true
        expect(recipientBalance.gt(BigNumber.from(0))).to.be.true

        it("Should not let signature replay happen", async () => {
            // Deploy the contracts
            const randomTokenFactory = await ethers.getContractFactory("RandomToken")
            const randomToken = await randomTokenFactory.deploy()
            await randomToken.deployed()

            const MetaTokenFactory = await ethers.getContractFactory("TokenSenderMod")
            const tokenSenderContract = await MetaTokenFactory.deploy()
            await tokenSenderContract.deployed()

            // Get three users
            const [_, userAddress, relayerAddress, recipientAddress] = await ethers.getSigners()

            // Mint 100000 tokens
            const tokenWithDecimals = parseEther("10000")
            const userTokenContractInstance = randomToken.connect(userAddress)
            const mintTxn = await userTokenContractInstance.freeMint(tokenWithDecimals)
            await mintTxn.deployed()

            // Have user approve the token sender contract
            const approveTxn = await userTokenContractInstance.approve(
                tokenSenderContract.address,
                BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff") // Max hex number
            )
            await approveTxn.wait()

            // Have user sign message to transfer 10 token to recipient

            let noce = 1

            const transferAmountOfTokens = parseEther("10")
            const messafeHash = await tokenSenderContract.getHash(
                userAddress.address,
                transferAmountOfTokens,
                recipientAddress.address,
                randomToken.address,
                nonce
            )
            const signature = await userAddress.signMessage(arrayify(messafeHash))
            const relayerSenderContractInstance = tokenSender.connect(relayerAddress)
            const metaTxn = await relayerSenderContractInstance.transfer(
                userAddress.address,
                transferAmountOfTokens,
                recipientAddress.address,
                randomToken.address,
                nonce,
                signature
            )
            await metaTxn.wait()

            // let's try to execute the same transacion, with the same signature
            // we expect transaction reverted becuase the signature has already been used

            expect(
                relayerSenderContractInstance.transfer(
                    userAddress.address,
                    transferAmountOfTokens,
                    recipientAddress.address,
                    randomToken.address,
                    nonce,
                    signature
                )
            ).to.be.revertedWith( "Already executed!")
        })
    })
})
