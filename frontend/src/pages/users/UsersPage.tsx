import React, { useEffect, useState } from 'react';
import { userApi } from '../../api/userApi.js';
import { User, UserRole } from '../../types/index.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Table, Column } from '../../components/common/Table.js';
import { RoleBadge } from '../../components/common/RoleBadge.js';
import { Badge } from '../../components/common/Badge.js';
import { Button } from '../../components/common/Button.js';
import { Modal } from '../../components/common/Modal.js';
import { Select } from '../../components/common/Select.js';
import { Input } from '../../components/common/Input.js';
import { Search, ShieldAlert, UserCheck, Shield } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('VIEWER');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await userApi.getUsers({ search });
      if (res.data) setUsers(res.data);
    } catch (err: any) {
      toastError(err.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenRoleModal = (u: User) => {
    setSelectedUser(u);
    setNewRole(u.role);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setIsUpdating(true);
    try {
      await userApi.updateRole(selectedUser.id, newRole);
      success(`Updated ${selectedUser.firstName}'s role to ${newRole.replace(/_/g, ' ')}`);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      toastError(err.message || 'Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User / Profile',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pitch-950 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
            {u.firstName[0]}
            {u.lastName[0]}
          </div>
          <div>
            <p className="font-bold text-white text-sm">
              {u.firstName} {u.lastName}
            </p>
            <p className="text-xs text-slate-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      render: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <Badge variant={u.status === 'ACTIVE' ? 'emerald' : 'amber'} dot size="sm">
          {u.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Registered',
      render: (u) => (
        <span className="text-xs text-slate-400">
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (u) =>
        currentUser?.role === 'SUPER_ADMIN' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenRoleModal(u)}
            icon={<Shield className="w-3.5 h-3.5" />}
          >
            Change Role
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & Access Control"
        subtitle="Manage platform users and assign granular role-based permissions."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'User Directory' }]}
      />

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="max-w-md w-full">
          <Input
            placeholder="Search users by name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
        <Table
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          isLoading={isLoading}
          emptyTitle="No users found"
          emptyDescription="Try adjusting your search criteria or register new users."
        />
      </div>

      {/* Role Assignment Modal */}
      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title="Update Account Role"
          subtitle={`Modifying access permissions for ${selectedUser.firstName} ${selectedUser.lastName}`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setSelectedUser(null)} disabled={isUpdating}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateRole}
                isLoading={isUpdating}
                icon={<UserCheck className="w-4 h-4" />}
              >
                Apply Role
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-pitch-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Current Role</p>
                <p className="text-sm font-bold text-white">{selectedUser.role}</p>
              </div>
              <RoleBadge role={selectedUser.role} />
            </div>

            <Select
              label="Select New Role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              options={[
                { label: 'Super Admin', value: 'SUPER_ADMIN' },
                { label: 'Tournament Admin', value: 'TOURNAMENT_ADMIN' },
                { label: 'League Admin', value: 'LEAGUE_ADMIN' },
                { label: 'Official Scorer', value: 'SCORER' },
                { label: 'Team Manager', value: 'TEAM_MANAGER' },
                { label: 'Player', value: 'PLAYER' },
                { label: 'Viewer', value: 'VIEWER' },
              ]}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
