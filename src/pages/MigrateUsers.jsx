import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Users, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function MigrateUsers() {
  const [migrating, setMigrating] = useState(false);
  const [results, setResults] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleMigration = async () => {
    if (!confirm('This will migrate all users to the new feature-based access control system. Continue?')) {
      return;
    }

    setMigrating(true);
    try {
      const response = await base44.functions.invoke('migrateUsersToFeatures', {});
      setResults(response.data);
      toast.success(`Migration completed! ${response.data.results.filter((r) => r.success).length} users migrated.`);
    } catch (error) {
      toast.error('Migration failed: ' + error.message);
    } finally {
      setMigrating(false);
    }
  };

  if (!currentUser?.is_super_admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Access denied. Super admin access required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <RefreshCw className={`w-6 h-6 ${migrating ? 'animate-spin' : ''}`} />
            <div>
              <CardTitle>Migrate Users to Feature-Based Access</CardTitle>
              <CardDescription>
                Convert existing users from the old role/departments system to the new feature-based access control
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2">What this does:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Maps <code>role: 'super_admin'</code> → <code>is_super_admin: true</code></li>
              <li>• Maps <code>role: 'company_admin'/'admin'</code> → <code>is_company_admin: true</code></li>
              <li>• Maps <code>can_manage_permissions</code> → <code>is_company_admin: true</code></li>
              <li>• Converts <code>departments_access</code> to <code>enabled_features</code></li>
              <li>• Sets <code>user_type</code> based on linked entities</li>
            </ul>
          </div>

          <Button
            onClick={handleMigration}
            disabled={migrating}
            className="w-full"
          >
            {migrating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Run Migration
              </>
            )}
          </Button>

          {results && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>
                  Successful: {results.results.filter((r) => r.success).length}
                </span>
                {results.results.some((r) => !r.success) && (
                  <>
                    <XCircle className="w-4 h-4 text-red-600 ml-4" />
                    <span>
                      Failed: {results.results.filter((r) => !r.success).length}
                    </span>
                  </>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3">
                {results.results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`text-sm p-2 rounded ${
                      result.success
                        ? 'bg-green-50 dark:bg-green-950/20'
                        : 'bg-red-50 dark:bg-red-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{result.email}</span>
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    {result.success && result.updates && (
                      <pre className="text-xs mt-1 text-muted-foreground overflow-x-auto">
                        {JSON.stringify(result.updates, null, 2)}
                      </pre>
                    )}
                    {!result.success && result.error && (
                      <p className="text-xs text-red-600 mt-1">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}