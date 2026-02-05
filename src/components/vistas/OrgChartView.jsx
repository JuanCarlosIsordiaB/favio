import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { usePersonnel } from '../../hooks/usePersonnel';
import { ChevronDown, ChevronRight, User } from 'lucide-react';

export default function OrgChartView({ firmId, personnel = [] }) {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [orgTree, setOrgTree] = useState([]);
  const { getOrgChart } = usePersonnel(firmId);

  useEffect(() => {
    const loadOrgChart = async () => {
      const tree = await getOrgChart();
      setOrgTree(tree);
    };
    if (firmId) {
      loadOrgChart();
    }
  }, [firmId]);

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderNode = (node, level = 0) => {
    const isExpanded = expandedIds.has(node.id);
    const hasSubordinates = node.subordinates && node.subordinates.length > 0;

    return (
      <div key={node.id}>
        <div
          style={{ marginLeft: `${level * 24}px` }}
          className="flex items-center gap-2 py-2 px-4 hover:bg-slate-50 rounded"
        >
          {hasSubordinates ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="p-0 hover:bg-slate-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          <User className="w-4 h-4 text-blue-600 flex-shrink-0" />

          <div className="flex-1">
            <div className="font-medium text-sm">{node.full_name}</div>
            <div className="text-xs text-muted-foreground">{node.position_title}</div>
          </div>

          <div className="text-xs text-slate-500 whitespace-nowrap">
            {node.role}
          </div>

          <div className={`px-2 py-1 rounded text-xs font-medium ${
            node.status === 'ACTIVE'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {node.status}
          </div>
        </div>

        {hasSubordinates && isExpanded && (
          <div className="border-l-2 border-slate-200">
            {node.subordinates.map(subordinate =>
              renderNode(subordinate, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (!orgTree || orgTree.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No hay estructura organizacional definida.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-0">
          {orgTree.map(node => renderNode(node))}
        </div>
      </CardContent>
    </Card>
  );
}
