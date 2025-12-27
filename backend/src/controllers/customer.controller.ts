import { NextFunction, Response } from 'express';
import { Customer } from '../models/Customer';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';
import { AzureDevOpsClient } from '../services/azure-devops-client.service';

export const createCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await Customer.create({
      ...req.body,
      userId: req.user._id,
    });
    return res.status(201).json(customer);
  } catch (error) {
    return res.status(400).json({ message: 'Error creating customer', error });
  }
};

export const getCustomers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const customers = await Customer.find({ userId: req.user._id })
      .sort({ name: 1 });
    res.json(customers);
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers', error });
  }
};

export const getCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json(customer);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching customer', error });
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('Updating customer with data:', {
      hasAzureDevOps: !!req.body.azureDevOps,
      azureDevOpsEnabled: req.body.azureDevOps?.enabled,
      patLength: req.body.azureDevOps?.pat?.length || 0,
      patPreview: req.body.azureDevOps?.pat ? `${req.body.azureDevOps.pat.substring(0, 10)}...` : 'empty'
    });

    // Find the customer first
    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Update fields explicitly to ensure Mongoose change detection works
    const { name, contactInfo, billingDetails, azureDevOps } = req.body;
    
    if (name !== undefined) {
      customer.name = name;
    }
    if (contactInfo !== undefined) {
      customer.contactInfo = { ...customer.contactInfo, ...contactInfo };
      customer.markModified('contactInfo');
    }
    if (billingDetails !== undefined) {
      customer.billingDetails = { ...customer.billingDetails, ...billingDetails };
      customer.markModified('billingDetails');
    }
    if (azureDevOps !== undefined) {
      // Only update PAT if a new one is provided (non-empty)
      if (azureDevOps.pat && azureDevOps.pat.trim() !== '') {
        // New PAT provided - update everything including PAT
        customer.azureDevOps = { ...customer.azureDevOps, ...azureDevOps };
        customer.markModified('azureDevOps');
      } else if (customer.azureDevOps) {
        // No new PAT - only update organizationUrl and enabled, preserve existing PAT
        customer.azureDevOps.organizationUrl = azureDevOps.organizationUrl;
        customer.azureDevOps.enabled = azureDevOps.enabled;
        // Mark only the specific fields as modified, not the PAT
        customer.markModified('azureDevOps.organizationUrl');
        customer.markModified('azureDevOps.enabled');
      } else {
        // No existing azureDevOps - create new without PAT (edge case)
        customer.azureDevOps = {
          organizationUrl: azureDevOps.organizationUrl,
          enabled: azureDevOps.enabled,
          pat: ''
        };
        customer.markModified('azureDevOps');
      }
    }

    console.log('Before save - PAT info:', {
      patLength: customer.azureDevOps?.pat?.length || 0,
      patPreview: customer.azureDevOps?.pat ? `${customer.azureDevOps.pat.substring(0, 10)}...` : 'empty',
      isModified: customer.isModified('azureDevOps.pat')
    });

    // Save (this will trigger pre-save hooks for encryption)
    await customer.save();

    console.log('After save - PAT encrypted');

    return res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(400).json({ message: 'Error updating customer', error });
  }
};

export const deleteCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting customer', error });
  }
};

export const validateAzureDevOpsProject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { projectName } = req.body;
    const userId = req.user._id;

    // Validate request body
    if (!projectName || typeof projectName !== 'string') {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }

    // Find customer and verify ownership
    const customer = await Customer.findOne({ _id: id, userId });

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    // Validate customer has Azure DevOps configured
    if (!customer.azureDevOps?.enabled) {
      res.status(400).json({
        valid: false,
        error: 'Azure DevOps is not enabled for this customer'
      });
      return;
    }

    if (!customer.azureDevOps.organizationUrl || !customer.azureDevOps.pat) {
      res.status(400).json({
        valid: false,
        error: 'Azure DevOps configuration is incomplete for this customer'
      });
      return;
    }

    // Decrypt PAT
    const decryptedPAT = customer.getDecryptedPAT();

    if (!decryptedPAT) {
      res.status(500).json({
        valid: false,
        error: 'Failed to decrypt Azure DevOps PAT'
      });
      return;
    }

    // Create Azure DevOps client and validate project
    try {
      const azureDevOpsClient = new AzureDevOpsClient(
        customer.azureDevOps.organizationUrl,
        decryptedPAT
      );

      const azureProject = await azureDevOpsClient.getProject(projectName);

      res.status(200).json({
        valid: true,
        projectId: azureProject.id,
        projectName: azureProject.name,
        projectUrl: azureProject.url
      });
    } catch (error) {
      console.error('Error validating Azure DevOps project:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Determine appropriate status code based on error
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          valid: false,
          error: errorMessage
        });
      } else if (errorMessage.includes('authentication failed')) {
        res.status(401).json({
          valid: false,
          error: errorMessage
        });
      } else {
        res.status(500).json({
          valid: false,
          error: 'Failed to validate Azure DevOps project'
        });
      }
    }
  } catch (error) {
    console.error('Error in validateAzureDevOpsProject:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};