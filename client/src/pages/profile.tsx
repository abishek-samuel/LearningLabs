import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, Mail, Phone, MapPin, Briefcase, GraduationCap, User, ShieldCheck, Bell, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await fetch('/api/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        body: data,
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: "Success", description: "Profile updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update password');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Password updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    formData.append('id', user?.id.toString() || '');

    if (selectedFile) {
      formData.append('profilePicture', selectedFile);
    }

    updateProfileMutation.mutate(formData);
  };


  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
      ...Object.fromEntries(formData.entries()),
      id: user?.id
    };
    if (data.newPassword !== data.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }
    updatePasswordMutation.mutate(data);
  };

  if (isLoading) {
    return <MainLayout>Loading...</MainLayout>;
  }

  return (
    <MainLayout>
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white">Profile</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="sticky top-6">

              <div className="flex flex-col items-center p-6 bg-white dark:bg-slate-800 shadow rounded-lg mb-6">
                <div className="flex justify-center mb-6">
                  <div className="space-y-2 text-center">
                    <div className="relative inline-block">
                      <Avatar className="h-24 w-24 cursor-pointer rounded-full overflow-hidden">
                        <AvatarImage
                          className="avatar-image rounded-full object-cover"
                          src={
                            preview ||
                            profile?.profilePicture ||
                            `https://ui-avatars.com/api/?name=${profile?.firstName}+${profile?.lastName}&background=0D8ABC&color=fff`
                          }

                          alt="Profile"
                        />
                        <AvatarFallback>
                          {profile?.firstName?.[0]}
                          {profile?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>

                      <Input
                        type="file"
                        name="profilePicture"
                        accept="image/*"
                        className="hidden"
                        id="profilePicture"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file); // <-- Store the file
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />


                      <Label
                        htmlFor="profilePicture"
                        className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer shadow-lg"
                      >
                        <Pencil className="h-4 w-4" />
                      </Label>
                    </div>
                    <p className="text-sm text-slate-500">Click to change profile picture</p>
                    <h2 className="text-xl font-semibold mb-1">
                      {profile?.firstName} {profile?.lastName}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                      {profile?.email}
                    </p>
                    <Badge className="mb-3">{profile?.role}</Badge>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="flex-1">
            <Tabs defaultValue="personal">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="personal" className="flex-1">Personal Info</TabsTrigger>
                <TabsTrigger value="account" className="flex-1">Account</TabsTrigger>
                <TabsTrigger value="notifications" className="flex-1">Notifications</TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <form onSubmit={handleProfileSubmit}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Update your personal details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">Username</Label>
                          <Input id="username" name="username" readOnly defaultValue={profile?.username || ''} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" type="email" readOnly defaultValue={profile?.email || ''} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Role</Label>
                          <Input id="role" name="role" readOnly defaultValue={profile?.role || ''} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input id="firstName" name="firstName" defaultValue={profile?.firstName || ''} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" name="lastName" defaultValue={profile?.lastName || ''} />
                        </div>

                      </div>

                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button type="button" variant="outline">Cancel</Button>
                      <Button type="submit" disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </TabsContent>

              <TabsContent value="account">
                <form onSubmit={handlePasswordSubmit}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Settings</CardTitle>
                      <CardDescription>Manage your account preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input id="currentPassword" name="currentPassword" type="password" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input id="newPassword" name="newPassword" type="password" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input id="confirmPassword" name="confirmPassword" type="password" />
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button type="button" variant="outline">Cancel</Button>
                      <Button type="submit" disabled={updatePasswordMutation.isPending}>
                        {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Control how and when you receive notifications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-base font-medium">Email Notifications</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-slate-400" />
                            <Label htmlFor="courseUpdates">Course updates and announcements</Label>
                          </div>
                          <Switch id="courseUpdates" defaultChecked />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-slate-400" />
                            <Label htmlFor="assessmentReminders">Assessment reminders</Label>
                          </div>
                          <Switch id="assessmentReminders" defaultChecked />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline">Reset to Defaults</Button>
                    <Button>Save Preferences</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}