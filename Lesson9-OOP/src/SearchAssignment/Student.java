package SearchAssignment;

public class Student implements Comparable{
    private String Name;
    private String Address;
    private int Id;
    
    public Student(String n,String a,int i){
        Name=n;
        Address=a;
        Id=i;
    }
    
    @Override
    public String toString(){
        return "Name:\t"+Name+"\nAddress:\t"+Address+"\nId:\t"+Id;
    }
    
    public int getId(){
        return Id;
    }
    
    @Override
    public int compareTo(Object t) {
        if(this.Id>((Student)t).getId()){
            return 1;
        }else if(this.Id<((Student)t).getId()){
            return -1;
        }else{
            return 0;
        }
    }
}
