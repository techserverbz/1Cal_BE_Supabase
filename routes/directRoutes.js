import express from "express";
import * as directController from "../controller/directController.js";

const router = express.Router();

router.post("/full", directController.cloneFullTemplate);
router.put("/createcopy/:id", directController.createCopy);
router.get("/getall", directController.getAllDirect);
router.get("/getmy", directController.getMyFeasibilities);
router.get("/getcollab", directController.getCollaborativeFeasibilities);
router.put("/save/:id", directController.saveMasterInput);
router.get("/analytics", directController.getAnalytics);
router.get("/analytics/datewise", directController.getDatewiseGrowthAnalytics);
router.get("/:id", directController.getFormulaTemplateById);
router.put("/addcollab/:id", directController.addCollaborator);
router.put("/update-name/:id", directController.updatename);

export default router;
