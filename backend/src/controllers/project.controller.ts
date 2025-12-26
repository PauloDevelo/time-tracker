import { Response } from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { Customer } from '../models/Customer';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';
import { AzureDevOpsClient } from '../services/azure-devops-client.service';
import { AzureDevOpsSyncService } from '../services/azure-devops-sync.service';


/**
 * Create a new project
 */
export const createProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, url, customerId, azureDevOps } = req.body;
    
    // Assuming user ID is available from authentication middleware
    const userId = req.user?._id; 
    
    const projectData: any = {
      name,
      description,
      url,
      customerId,
      userId,
    };
    
    // Include azureDevOps if provided
    if (azureDevOps) {
      projectData.azureDevOps = azureDevOps;
    }
    
    const project = new Project(projectData);

    const savedProject = await project.save();
    
    res.status(201).json(savedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(400).json({ 
      message: 'Failed to create project',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get all projects for the current user
 */
export const getAllProjects =  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { customerId, search } = req.query;
    
    // Build filter conditions
    const filter: any = { userId };
    
    if (customerId) {
      filter.customerId = customerId;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const projects = await Project.find(filter)
      .populate('customerId', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ 
      message: 'Failed to fetch projects',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get a project by ID
 */
export const getProjectById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }
    
    const project = await Project.findOne({ _id: id, userId })
      .populate('customerId', 'name');
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    res.status(200).json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ 
      message: 'Failed to fetch project',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Update a project by ID
 */
export const updateProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const { name, description, url, customerId, azureDevOps } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }
    
    const project = await Project.findOne({ _id: id, userId });
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    // Build update object
    const updateData: any = { name, description, url, customerId };
    
    // Include azureDevOps if provided
    if (azureDevOps !== undefined) {
      updateData.azureDevOps = azureDevOps;
    }
    
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('customerId', 'name');
    
    res.status(200).json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(400).json({ 
      message: 'Failed to update project',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Delete a project by ID
 */
export const deleteProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }
    
    const project = await Project.findOne({ _id: id, userId });
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    await Project.findByIdAndDelete(id);
    
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ 
      message: 'Failed to delete project',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Validate Azure DevOps project name
 */
export const validateAzureDevOpsProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { projectName } = req.body;
    const userId = req.user?._id;
    
    // Validate project ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }
    
    // Validate request body
    if (!projectName || typeof projectName !== 'string') {
      res.status(400).json({ message: 'Project name is required' });
      return;
    }
    
    // Find project and verify ownership
    const project = await Project.findOne({ _id: id, userId }).populate('customerId');
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    // Get customer with Azure DevOps configuration
    const customer = await Customer.findById(project.customerId);
    
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
          error: 'Azure DevOps authentication failed. Please check your PAT.'
        });
      } else {
        res.status(503).json({ 
          valid: false,
          error: 'Failed to connect to Azure DevOps. Please try again later.'
        });
      }
    }
  } catch (error) {
    console.error('Error in validateAzureDevOpsProject:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get Azure DevOps iterations for a project
 */
export const getAzureDevOpsIterations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    
    // Validate project ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }
    
    // Find project and verify ownership
    const project = await Project.findOne({ _id: id, userId }).populate('customerId');
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    // Validate project has Azure DevOps enabled
    if (!project.azureDevOps?.enabled || !project.azureDevOps.projectId) {
      res.status(400).json({ 
        message: 'Azure DevOps is not enabled for this project'
      });
      return;
    }
    
    // Get customer with Azure DevOps configuration
    const customer = await Customer.findById(project.customerId);
    
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }
    
    // Validate customer has Azure DevOps configured
    if (!customer.azureDevOps?.enabled || !customer.azureDevOps.organizationUrl || !customer.azureDevOps.pat) {
      res.status(400).json({ 
        message: 'Azure DevOps is not configured for this customer'
      });
      return;
    }
    
    // Decrypt PAT
    const decryptedPAT = customer.getDecryptedPAT();
    
    console.log('Decrypted PAT info:', {
      hasDecryptedPAT: !!decryptedPAT,
      patLength: decryptedPAT?.length || 0,
      organizationUrl: customer.azureDevOps.organizationUrl,
      encryptedPATPreview: customer.azureDevOps.pat ? `${customer.azureDevOps.pat.substring(0, 10)}...` : 'empty'
    });
    
    if (!decryptedPAT) {
      res.status(500).json({ 
        message: 'Failed to decrypt Azure DevOps PAT'
      });
      return;
    }
    
    // Create Azure DevOps client and fetch iterations
    try {
      const azureDevOpsClient = new AzureDevOpsClient(
        customer.azureDevOps.organizationUrl,
        decryptedPAT
      );
      
      const iterations = await azureDevOpsClient.getIterations(project.azureDevOps.projectId);
      
      // Format iterations for response
      const formattedIterations = iterations.map(iteration => ({
        id: iteration.id,
        name: iteration.name,
        path: iteration.path,
        displayName: iteration.displayName,
        startDate: iteration.attributes.startDate,
        finishDate: iteration.attributes.finishDate,
      }));
      
      res.status(200).json(formattedIterations);
    } catch (error) {
      console.error('Error fetching Azure DevOps iterations:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('authentication failed')) {
        res.status(401).json({ 
          message: 'Azure DevOps authentication failed. Please check your PAT.'
        });
      } else {
        res.status(503).json({ 
          message: 'Failed to connect to Azure DevOps. Please try again later.'
        });
      }
    }
  } catch (error) {
    console.error('Error in getAzureDevOpsIterations:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Import work items from Azure DevOps iteration
 */
export const importWorkItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { iterationPath } = req.body;
    const userId = req.user?._id;
    
    // Validate project ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }
    
    // Validate request body
    if (!iterationPath || typeof iterationPath !== 'string') {
      res.status(400).json({ message: 'Iteration path is required' });
      return;
    }
    
    // Find project and verify ownership
    const project = await Project.findOne({ _id: id, userId }).populate('customerId');
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    // Validate project has Azure DevOps enabled
    if (!project.azureDevOps?.enabled || !project.azureDevOps.projectId) {
      res.status(400).json({ 
        message: 'Azure DevOps is not enabled for this project'
      });
      return;
    }
    
    // Get customer with Azure DevOps configuration
    const customer = await Customer.findById(project.customerId);
    
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }
    
    // Validate customer has Azure DevOps configured
    if (!customer.azureDevOps?.enabled || !customer.azureDevOps.organizationUrl || !customer.azureDevOps.pat) {
      res.status(400).json({ 
        message: 'Azure DevOps is not configured for this customer'
      });
      return;
    }
    
    // Decrypt PAT
    const decryptedPAT = customer.getDecryptedPAT();
    
    if (!decryptedPAT) {
      res.status(500).json({ 
        message: 'Failed to decrypt Azure DevOps PAT'
      });
      return;
    }
    
    // Create Azure DevOps client and fetch work items
    try {
      const azureDevOpsClient = new AzureDevOpsClient(
        customer.azureDevOps.organizationUrl,
        decryptedPAT
      );
      
      const workItems = await azureDevOpsClient.getWorkItemsByIteration(
        project.azureDevOps.projectId,
        iterationPath
      );
      
      // Import work items using sync service
      const syncService = new AzureDevOpsSyncService();
      const importResult = await syncService.importWorkItems(
        workItems,
        id,
        userId.toString()
      );
      
      // Update project's lastSyncedAt timestamp
      project.azureDevOps.lastSyncedAt = new Date();
      await project.save();
      
      res.status(200).json({
        imported: importResult.imported,
        skipped: importResult.skipped,
        tasks: importResult.tasks,
      });
    } catch (error) {
      console.error('Error importing work items:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('not found')) {
        res.status(404).json({ 
          message: errorMessage
        });
      } else if (errorMessage.includes('authentication failed')) {
        res.status(401).json({ 
          message: 'Azure DevOps authentication failed. Please check your PAT.'
        });
      } else if (errorMessage.includes('rate limit')) {
        res.status(429).json({ 
          message: 'Azure DevOps rate limit exceeded. Please try again later.'
        });
      } else {
        res.status(503).json({ 
          message: 'Failed to connect to Azure DevOps. Please try again later.'
        });
      }
    }
  } catch (error) {
    console.error('Error in importWorkItems:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}