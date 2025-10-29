import { getPendingFirstWeight, getFirstWeightHistory } from "../services/firstWeight.service.js";

export async function fetchPendingFirstWeight(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const data = await getPendingFirstWeight(offset, limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending first weight data",
      error: error.message,
    });
  }
}

export async function fetchFirstWeightHistory(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const data = await getFirstWeightHistory(offset, limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch first weight history data",
      error: error.message,
    });
  }
}

