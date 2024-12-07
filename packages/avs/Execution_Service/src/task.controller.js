"use strict";
const { Router } = require("express");
const CustomError = require("./utils/validateError");
const CustomResponse = require("./utils/validateResponse");
const oracleService = require("./oracle.service");
const dalService = require("./dal.service");
const router = Router();

router.post("/execute", async (req, res) => {
    console.log("Executing intent solution task");
    try {
        const taskDefinitionId = Number(req.body.taskDefinitionId) || 0;
        const intentId = req.body.intentId;
        
        if (!intentId) {
            return res.status(400).send(new CustomError("intentId is required", {}));
        }

        console.log(`Processing intent: ${intentId}, taskDefinitionId: ${taskDefinitionId}`);
        
        // Get best solution
        const solution = await oracleService.getBestSolution(intentId);
        if (!solution) {
            return res.status(404).send(new CustomError("No solutions found", {}));
        }

        // Prepare result with metadata
        const result = {
            solution: solution,
            metadata: {
                processedAt: new Date().toISOString(),
                intentId: intentId
            }
        };

        // Store in IPFS
        const cid = await dalService.publishJSONToIpfs(result);
        
        // Prepare data for on-chain verification
        const data = JSON.stringify({
            intentId: intentId,
            solutionId: solution.id,
            amountWei: solution.amountWei,
            solverAddress: solution.solverAddress
        });

        // Send task for validation
        await dalService.sendTask(cid, data, taskDefinitionId);

        return res.status(200).send(
            new CustomResponse(
                {
                    proofOfTask: cid,
                    data: data,
                    taskDefinitionId: taskDefinitionId
                },
                "Intent solution task executed successfully"
            )
        );
    } catch (error) {
        console.error(error);
        return res.status(500).send(new CustomError("Task execution failed", {}));
    }
});

module.exports = router;