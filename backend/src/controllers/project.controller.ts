import { Response } from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';


/**
 * Create a new project
 */
export const createProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, url, customerId } = req.body;
    
    // Assuming user ID is available from authentication middleware
    const userId = req.user?._id; 
    
    const project = new Project({
      name,
      description,
      url,
      customerId,
      userId,
    });

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
    const { name, description, url, customerId } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }
    
    const project = await Project.findOne({ _id: id, userId });
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { name, description, url, customerId },
      { new: true, runValidators: true }
    );
    
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