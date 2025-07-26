import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TabsTest = () => {
    const [activeTab, setActiveTab] = useState("test1");

    return (
        <div className="p-4">
            <Card className="bg-aurora-card border-aurora-green/20">
                <CardHeader>
                    <CardTitle className="text-aurora-green-light">Tabs Test</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3 bg-aurora-card border border-aurora-green/20">
                            <TabsTrigger value="test1" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black">
                                Test 1
                            </TabsTrigger>
                            <TabsTrigger value="test2" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black">
                                Test 2
                            </TabsTrigger>
                            <TabsTrigger value="test3" className="data-[state=active]:bg-aurora-green data-[state=active]:text-black">
                                Test 3
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="test1" className="mt-4">
                            <p className="text-white">This is test tab 1 content</p>
                        </TabsContent>

                        <TabsContent value="test2" className="mt-4">
                            <p className="text-white">This is test tab 2 content</p>
                        </TabsContent>

                        <TabsContent value="test3" className="mt-4">
                            <p className="text-white">This is test tab 3 content</p>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default TabsTest;