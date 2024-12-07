"use strict";
const { Router } = require("express");
const CustomError = require("./utils/validateError");
const CustomResponse = require("./utils/validateResponse");
const validatorService = require("./validator.service");

const router = Router();

router.post("/validate", async (req, res) => {
    const proofOfTask = req.body.proofOfTask;
    const taskDefinitionId = req.body.taskDefinitionId;

    console.log(`Validating task: ${proofOfTask}, taskDefinitionId: ${taskDefinitionId}`);
    
    try {
        const isValid = await validatorService.validate(proofOfTask);
        
        const response = {
            isValid: isValid,
            proofOfTask: proofOfTask,
            taskDefinitionId: taskDefinitionId,
            timestamp: new Date().toISOString()
        };

        console.log('Validation result:', isValid ? 'Approved' : 'Not Approved');
        return res.status(200).send(new CustomResponse(response));
    } catch (error) {
        console.error("Validation error:", error);
        return res.status(500).send(new CustomError("Validation failed", {
            proofOfTask,
            error: error.message
        }));
    }
});

module.exports = router;