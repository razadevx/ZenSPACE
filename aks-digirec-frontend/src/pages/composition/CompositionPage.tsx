import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FlaskConical, Plus, Play, CheckCircle, Clock, Beaker
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUIStore } from '@/stores';
import { cn, formatNumber } from '@/lib/utils';
import gsap from 'gsap';

interface BallMill {
  id: string;
  name: string;
  type: 'clay' | 'glaze' | 'color';
  capacity: number;
  unit: string;
  status: string;
}

interface Batch {
  id: string;
  ballMillName: string;
  compositionName: string;
  batchSize: number;
  status: 'running' | 'completed';
  progress: number;
  startTime: Date;
}

export function CompositionPage() {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState('ball-mills');
  
  useEffect(() => {
    setPageTitle(t('navigation.compositionManager'));
  }, [setPageTitle, t]);
  
  useEffect(() => {
    gsap.fromTo(
      '.composition-content',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5 }
    );
  }, []);
  
  const demoBallMills: BallMill[] = [
    { id: '1', name: 'Ball Mill 1', type: 'clay', capacity: 500, unit: 'kg', status: 'active' },
    { id: '2', name: 'Ball Mill 2', type: 'glaze', capacity: 200, unit: 'liters', status: 'active' },
    { id: '3', name: 'Ball Mill 3', type: 'color', capacity: 100, unit: 'kg', status: 'active' },
  ];
  
  const demoBatches: Batch[] = [
    {
      id: '1',
      ballMillName: 'Ball Mill 1',
      compositionName: 'Clay Mix A',
      batchSize: 400,
      status: 'running',
      progress: 65,
      startTime: new Date(),
    },
    {
      id: '2',
      ballMillName: 'Ball Mill 2',
      compositionName: 'Clear Glaze',
      batchSize: 150,
      status: 'completed',
      progress: 100,
      startTime: new Date(),
    },
  ];
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'clay': return 'bg-amber-500';
      case 'glaze': return 'bg-blue-500';
      case 'color': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };
  
  return (
    <div className="composition-content space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('navigation.compositionManager')}</h1>
          <p className="text-muted-foreground">
            Manage ball mills and material compositions
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="ball-mills">Ball Mills</TabsTrigger>
          <TabsTrigger value="compositions">Compositions</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ball-mills" className="m-0 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {demoBallMills.map((mill) => (
              <Card key={mill.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-3 rounded-lg', getTypeColor(mill.type))}>
                        <FlaskConical className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">{mill.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{mill.type}</p>
                      </div>
                    </div>
                    <Badge variant={mill.status === 'active' ? 'default' : 'secondary'}>
                      {mill.status}
                    </Badge>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Capacity</span>
                      <span className="font-medium">
                        {formatNumber(mill.capacity, 0)} {mill.unit}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Beaker className="h-4 w-4 mr-1" />
                      Formula
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="compositions" className="m-0 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Material Compositions</CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Composition
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-right p-3 font-medium">Components</th>
                      <th className="text-right p-3 font-medium">Yield %</th>
                      <th className="text-center p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">Clay Mix A</td>
                      <td className="p-3">White Clay Body</td>
                      <td className="p-3">
                        <Badge className="bg-amber-500">Clay</Badge>
                      </td>
                      <td className="p-3 text-right">5</td>
                      <td className="p-3 text-right">95%</td>
                      <td className="p-3 text-center">
                        <Badge>Active</Badge>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">Clear Glaze</td>
                      <td className="p-3">Transparent Glaze</td>
                      <td className="p-3">
                        <Badge className="bg-blue-500">Glaze</Badge>
                      </td>
                      <td className="p-3 text-right">8</td>
                      <td className="p-3 text-right">92%</td>
                      <td className="p-3 text-center">
                        <Badge>Active</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="batches" className="m-0 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {batch.status === 'running' ? (
                          <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        <div>
                          <p className="font-semibold">{batch.compositionName}</p>
                          <p className="text-sm text-muted-foreground">{batch.ballMillName}</p>
                        </div>
                      </div>
                      <Badge
                        variant={batch.status === 'running' ? 'default' : 'secondary'}
                        className={batch.status === 'running' ? 'bg-yellow-500' : 'bg-green-500'}
                      >
                        {batch.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{batch.progress}%</span>
                      </div>
                      <Progress value={batch.progress} className="h-2" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Batch Size: {formatNumber(batch.batchSize, 0)} kg
                      </span>
                      <span className="text-muted-foreground">
                        Started: {batch.startTime.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
