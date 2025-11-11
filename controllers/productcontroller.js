// controllers/productController.js
const { Product } = require('../models');
const cloudinary = require('cloudinary').v2;

class ProductController {
  // Create
static async createProduct(req, res) {
  try {
    const tenantId = req.tenant.id; // Fixed tenant access
    const { categoryId, name, description, price, stock, available } = req.body; // Added destructuring
    let images = [];

    if (req.files && req.files.length > 0) {
      images = req.files.map(file => ({
        url: file.path, // Cloudinary URL
        public_id: file.filename, // Cloudinary public ID
      }));
    }

    const product = await Product.create({
      tenantId,
      categoryId: categoryId || null,
      name,
      description,
      price,
      stock,
      available: available ?? true, // default to true
      images
    });

    return res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create product' });
  }
}
  // List
  static async listProducts(req, res) {
    try {
      const tenantId = req.tenant.id;
      const products = await Product.findAll({
        where: { tenantId, status: 'active' }
      });
      return res.json(products);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  // Get one
  static async getProduct(req, res) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      const product = await Product.findOne({
        where: { id, tenantId }
      });

      if (!product) return res.status(404).json({ error: 'Product not found' });

      return res.json(product);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }

  // Update
    static async updateProduct(req, res) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;
            const { name, description, price, stock, status, available } = req.body;


      const product = await Product.findOne({ where: { id, tenantId } });
      if (!product) return res.status(404).json({ error: 'Product not found' });

      let images = product.images || [];

      if (req.files && req.files.length > 0) {
            images = req.files.map(file => ({
                url: file.path, // Cloudinary URL
                public_id: file.filename, // Cloudinary public ID
            }));
        }

      if (req.body.removeImages) {
            const removeList = JSON.parse(req.body.removeImages); // array of public_ids
            images = images.filter(img => !removeList.includes(img.public_id));

            // Delete from Cloudinary
            for (const id of removeList) {
                await cloudinary.uploader.destroy(id);
            }
        }

      // await product.update({
      //   ...req.body,
      //   images,
      // });

            // Update fields if provided
      if (name !== undefined) product.name = name;
      if (description !== undefined) product.description = description;
      if (price !== undefined) product.price = price;
      if (stock !== undefined) {
        product.stock = stock;

        // Auto-flip availability if stock = 0 and tenant hasn’t overridden
        if (stock <= 0 && available === undefined) {
          product.available = false;
        }
      }

      // Manual override from tenant
      if (available !== undefined) {
        product.available = available;
      }

      if (status !== undefined) product.status = status;

      await product.save();


      return res.json(product);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update product' });
    }
  };
  // Delete (soft delete via status)
  static async deleteProduct(req, res) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      const product = await Product.findOne({ where: { id, tenantId } });
      if (!product) return res.status(404).json({ error: 'Product not found' });

      if (product.images && product.images.length > 0) {
        for (const img of product.images) {
            await cloudinary.uploader.destroy(img.public_id);
        }
    }

    

      await product.update({ status: 'archived' });
      return res.json({ message: 'Product archived successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  static async toggleAvailability(req, res) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      const product = await Product.findOne({
        where: { id, tenantId }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      product.available = !product.available;
      await product.save();

      return res.json({
        message: `Product availability updated to ${product.available ? 'Available' : 'Not Available'}`,
        product
      });
    } catch (error) {
      console.error('Toggle availability error:', error);
      return res.status(500).json({ error: 'Failed to toggle product availability' });
    }
  }

}

module.exports = ProductController;
