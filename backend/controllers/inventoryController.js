const Material = require('../models/Material');
const Project = require('../models/Project');

const getProjectInventory = async (req, res) => {
    const { id: projectId } = req.params;

    try {
        const materials = await Material.find({ project_id: projectId });

        let totalValue = 0;
        let pendingOrders = 0;
        let outOfStock = 0;
        let monthlyInflow = 0;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const materialData = materials.map(mat => {
            const matValue = mat.balance * mat.unitPrice;
            totalValue += matValue;

            if (mat.status === 'OUT OF STOCK') outOfStock++;
            if (mat.status === 'LOW STOCK') pendingOrders++;

            mat.logs.forEach(log => {
                if (log.type === 'delivery') {
                    const logDate = new Date(log.date);
                    if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
                        monthlyInflow += (log.totalCost || 0);
                    }
                }
            });

            return {
                id: mat._id.toString(),
                name: mat.name,
                unit: mat.unit,
                inflow: mat.inflow.toLocaleString(),
                outflow: mat.outflow.toLocaleString(),
                balance: mat.balance.toLocaleString(),
                value: `₹ ${matValue.toLocaleString()}`,
                status: mat.status,
                iconType: mat.iconType
            };
        });

        let formattedInflow = `₹ ${monthlyInflow.toLocaleString()}`;
        if (monthlyInflow >= 100000) {
            formattedInflow = `₹ ${(monthlyInflow / 100000).toFixed(1)} L`;
        } else if (monthlyInflow >= 1000) {
            formattedInflow = `₹ ${(monthlyInflow / 1000).toFixed(1)} K`;
        }

        const realTimeInventoryData = {
            lastUpdated: new Date().toLocaleString(),
            totalValue: `₹ ${totalValue.toLocaleString()}`,
            summary: {
                pendingOrders: pendingOrders < 10 ? `0${pendingOrders}` : pendingOrders.toString(),
                outOfStock: `${outOfStock < 10 ? '0' : ''}${outOfStock} Items`,
                monthlyInflow: formattedInflow
            },
            materials: materialData
        };

        res.json(realTimeInventoryData);
    } catch (error) {
        console.error("Error fetching inventory data:", error);
        res.status(500).json({ message: "Error fetching inventory data" });
    }
};

const logDelivery = async (req, res) => {
    const { id: projectId } = req.params;
    const { materialName, unit, quantity, supplier, totalCost, iconType } = req.body;

    try {
        const parsedQuantity = parseFloat(quantity);
        const parsedTotalCost = parseFloat(totalCost);

        // Files
        let deliveryChallanUrl = '';
        let stackPhotoUrl = '';

        if (req.files) {
            console.log("FILES RECEIVED: ", req.files);
            if (req.files['deliveryChallan'] && req.files['deliveryChallan'][0]) {
                deliveryChallanUrl = `${req.protocol}://${req.get('host')}/uploads/${req.files['deliveryChallan'][0].filename}`;
            }
            if (req.files['stackPhoto'] && req.files['stackPhoto'][0]) {
                stackPhotoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.files['stackPhoto'][0].filename}`;
            }
        }

        // Try to find material by exact name or create new
        let material = await Material.findOne({ project_id: projectId, name: new RegExp('^' + materialName + '$', 'i') });

        if (!material) {
            material = new Material({
                project_id: projectId,
                name: materialName,
                unit: unit,
                iconType: iconType || 'box'
            });
        }

        // Update balances
        material.inflow += parsedQuantity;
        material.balance += parsedQuantity;

        // Update average unit price
        if (parsedQuantity > 0 && parsedTotalCost > 0) {
            material.unitPrice = parsedTotalCost / parsedQuantity;
        }

        // Add log
        material.logs.push({
            type: 'delivery',
            quantity: parsedQuantity,
            supplier: supplier,
            totalCost: parsedTotalCost,
            deliveryChallanUrl,
            stackPhotoUrl
        });

        await material.save();
        res.status(200).json(material);

    } catch (error) {
        console.error("Error logging delivery:", error);
        res.status(500).json({ message: "Error logging delivery" });
    }
};

const logUsage = async (req, res) => {
    const { id: projectId } = req.params;
    const { materialId, quantity, locationPurpose } = req.body;

    try {
        const parsedQuantity = parseFloat(quantity);
        const material = await Material.findOne({ _id: materialId, project_id: projectId });

        if (!material) {
            return res.status(404).json({ message: "Material not found" });
        }

        let usagePhotoUrl = '';
        if (req.files && req.files['usagePhoto'] && req.files['usagePhoto'][0]) {
            usagePhotoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.files['usagePhoto'][0].filename}`;
        }

        // Update balances
        material.outflow += parsedQuantity;
        material.balance -= parsedQuantity; // Can go negative if logging mistake, better to allow than block block hard

        material.logs.push({
            type: 'usage',
            quantity: parsedQuantity,
            locationPurpose: locationPurpose,
            usagePhotoUrl
        });

        await material.save();
        res.status(200).json(material);

    } catch (error) {
        console.error("Error logging usage:", error);
        res.status(500).json({ message: "Error logging usage" });
    }
};

module.exports = { getProjectInventory, logDelivery, logUsage };
