// Exemple d'utilisation du middleware Cloudinary

// Dans routes/menu.js
const { uploadMenuImage } = require('../middleware/cloudinaryUpload');

// Remplace le middleware actuel
router.post('/', protect, authorize('admin'), uploadMenuImage, createMenuItem);
router.put('/:id', protect, authorize('admin'), uploadMenuImage, updateMenuItem);

// Dans routes/users.js (pour avatars)
const { uploadAvatar } = require('../middleware/cloudinaryUpload');

router.put('/profile/avatar', protect, uploadAvatar, updateAvatar);

// Dans le controller (simplifié)
const createMenuItem = async (req, res) => {
  // Plus besoin de gérer l'upload manuellement
  // req.body.image contient déjà l'URL Cloudinary

  const menuItem = await MenuItem.create(req.body);

  res.status(201).json({
    success: true,
    data: menuItem
  });
};

// Suppression avec cleanup automatique
const deleteMenuItem = async (req, res) => {
  const menuItem = await MenuItem.findById(req.params.id);

  if (menuItem.cloudinaryPublicId) {
    await deleteImage(menuItem.cloudinaryPublicId);
  }

  await menuItem.remove();

  res.status(200).json({ success: true });
};