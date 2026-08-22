import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { Item, CreateItemDto, ItemCategory, ItemPriority, ItemStatus } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge, BadgeVariant } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';

export const ItemManager: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<CreateItemDto>({
    title: '',
    description: '',
    category: 'feature',
    priority: 'medium',
    status: 'pending',
  });

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getItems({
        search: search || undefined,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
      });
      setItems(res.data || []);
    } catch (err: any) {
      showToast('Failed to load items', 'error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategory, selectedStatus, showToast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      category: 'feature',
      priority: 'medium',
      status: 'pending',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      category: item.category,
      priority: item.priority,
      status: item.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Validation Error', 'error', 'Title is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await api.updateItem(editingItem.id, formData);
        showToast('Item updated', 'success', `"${formData.title}" was updated.`);
      } else {
        await api.createItem(formData);
        showToast('Item created', 'success', `"${formData.title}" was added.`);
      }
      setIsModalOpen(false);
      loadItems();
    } catch (err: any) {
      showToast('Failed to save item', 'error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await api.deleteItem(id);
      showToast('Item deleted', 'info', `"${title}" has been deleted.`);
      loadItems();
    } catch (err: any) {
      showToast('Failed to delete', 'error', err.message);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset all items back to default starter sample items?')) return;
    try {
      await api.resetItems();
      showToast('Data Reset', 'info', 'Sample data restored to defaults.');
      loadItems();
    } catch (err: any) {
      showToast('Reset failed', 'error', err.message);
    }
  };

  const getPriorityBadgeVariant = (priority: ItemPriority): BadgeVariant => {
    switch (priority) {
      case 'urgent':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
      default:
        return 'secondary';
    }
  };

  const getStatusBadgeVariant = (status: ItemStatus): BadgeVariant => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'pending':
      default:
        return 'secondary';
    }
  };

  return (
    <div>
      {/* Controls Bar */}
      <Card style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Search and Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
            <input
              type="text"
              placeholder="Search items by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
              style={{ maxWidth: '320px' }}
            />

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-control"
              style={{ width: 'auto' }}
            >
              <option value="">All Categories</option>
              <option value="feature">Features</option>
              <option value="task">Tasks</option>
              <option value="bug">Bugs</option>
              <option value="documentation">Documentation</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-control"
              style={{ width: 'auto' }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="secondary" size="sm" onClick={handleResetData}>
              Reset Defaults
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              leftIcon={
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              Add New Item
            </Button>
          </div>
        </div>
      </Card>

      {/* Items List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          Loading items from API...
        </div>
      ) : items.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No items found
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Try adjusting your search filters or click &quot;Add New Item&quot; to create one.
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
            Create First Item
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((item) => (
            <Card key={item.id} interactive style={{ padding: '1.25rem 1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>{item.title}</h3>
                    <Badge variant={getStatusBadgeVariant(item.status)} dot>
                      {item.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant={getPriorityBadgeVariant(item.priority)}>
                      {item.priority}
                    </Badge>
                    <Badge variant="secondary">
                      {item.category}
                    </Badge>
                  </div>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      marginTop: '0.5rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {item.description}
                  </p>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginTop: '0.75rem',
                    }}
                  >
                    Created: {new Date(item.createdAt).toLocaleDateString()} at{' '}
                    {new Date(item.createdAt).toLocaleTimeString()} &bull; ID: <code>{item.id}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenEditModal(item)}
                    title="Edit Item"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(item.id, item.title)}
                    title="Delete Item"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Item' : 'Create New Item'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
              {editingItem ? 'Save Changes' : 'Create Item'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <Input
            label="Title"
            placeholder="e.g. Implement User Authentication"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Describe the item or requirements..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as ItemCategory })
                }
              >
                <option value="feature">Feature</option>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="documentation">Documentation</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-control"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as ItemPriority })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as ItemStatus })
                }
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
