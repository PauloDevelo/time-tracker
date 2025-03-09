import { Response } from 'express';
import { UserSettings } from '../models/UserSettings';
import { AuthenticatedRequest } from '../middleware/authenticated-request.model';

// Get user settings
export const getUserSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let userSettings = await UserSettings.findOne({ userId: req.user._id });
    
    if (!userSettings) {
      // If no settings exist yet, create default settings
      userSettings = await UserSettings.create({
        userId: req.user._id,
        companyInformation: {
          name: '',
          address: '',
          businessNumber: '',
          incorporationNumber: '',
        },
        personalInformation: {
          address: '',
        }
      });
    }

    return res.json(userSettings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return res.status(500).json({ error: 'Failed to retrieve user settings' });
  }
};

// Update user settings
export const updateUserSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get current user settings to avoid data loss
    const currentSettings = await UserSettings.findOne({ userId: req.user._id });
    const { companyInformation, personalInformation } = req.body;
    
    // Prepare update object
    const updateData: any = {};
    
    // Only update company information if explicitly provided (not undefined)
    if (companyInformation !== undefined) {
      // Merge with existing data to avoid losing fields not included in the request
      updateData.companyInformation = currentSettings?.companyInformation
        ? { ...currentSettings.companyInformation, ...companyInformation }
        : companyInformation;
    }
    
    // Only update personal information if explicitly provided (not undefined)
    if (personalInformation !== undefined) {
      // Merge with existing data to avoid losing fields not included in the request
      updateData.personalInformation = currentSettings?.personalInformation
        ? { ...currentSettings.personalInformation, ...personalInformation }
        : personalInformation;
    }
    
    // Handle file upload for profile image
    if (req.file) {
      if (!updateData.personalInformation) {
        // If personalInformation wasn't provided in this request but we have an image,
        // use the current personal information
        updateData.personalInformation = currentSettings?.personalInformation || {};
      }
      
      // Add image data
      updateData.personalInformation.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }
    
    // If no updates provided, return current settings
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }
    
    // Perform single update operation
    const updatedSettings = await UserSettings.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateData },
      { new: true, upsert: true }
    );
    
    if (!updatedSettings) {
      return res.status(404).json({ error: 'Failed to update user settings' });
    }
    
    return res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating user settings:', error);
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to update user settings: ${error.message}` });
    }
    return res.status(500).json({ error: 'Failed to update user settings' });
  }
};